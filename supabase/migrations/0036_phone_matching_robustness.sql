-- ============================================================
-- Arregla el "vincular cuenta" por teléfono cuando alguien tiene el suyo
-- guardado sin prefijo de país
-- ============================================================
-- Motivo: al invitar por WhatsApp/contacto, el número se normaliza con
-- prefijo de país (normalizePhoneWithCountryCode.js, ej. "+34612345678").
-- Pero hasta ahora "Editar datos personales" y el registro guardaban el
-- teléfono TAL CUAL lo escribiera cada uno — si alguien lo puso sin
-- prefijo ("612345678"), la comparación exacta de send_link_invitation /
-- respond_to_link_invitation / get_my_pending_link_invitations nunca
-- coincidía con el número ya normalizado del remitente, y la invitación
-- nunca le llegaba a esa persona (ni por aviso ni entrando a mano a
-- "Vincular cuenta") — sin ningún error visible en ningún sitio.
--
-- El código de la app ya se corrige aparte (register.jsx, edit-profile.jsx
-- ahora normalizan igual que al invitar), pero eso no arregla los
-- teléfonos que YA estaban guardados sin prefijo. Esta migración hace dos
-- cosas:
--   1. Rellena con "+34" los que no empiecen por "+" (asumiendo España,
--      igual que hace normalizePhoneWithCountryCode.js por defecto).
--   2. Cambia las 3 RPC de vincular cuenta para comparar solo los ÚLTIMOS
--      9 dígitos (el número nacional español, sin prefijo) en vez de exigir
--      coincidencia exacta del texto completo — así, aunque en el futuro
--      alguien vuelva a guardar un número en un formato distinto, la
--      comparación sigue funcionando en vez de fallar en silencio otra vez.

-- ------------------------------------------------------------
-- 1) Backfill de teléfonos ya guardados sin prefijo
-- ------------------------------------------------------------
update public.profiles
set phone = case
  when phone like '00%' then '+' || substring(phone from 3)
  else '+34' || regexp_replace(phone, '[^0-9]', '', 'g')
end
where phone is not null
  and trim(phone) <> ''
  and phone not like '+%';

-- ------------------------------------------------------------
-- 2) Helper: últimos 9 dígitos de un teléfono (número nacional español,
--    ignorando prefijo de país y cualquier espacio/guion/símbolo)
-- ------------------------------------------------------------
create or replace function public.phone_last9(p_phone text)
returns text
language sql
immutable
as $$
  select right(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), 9);
$$;

-- ------------------------------------------------------------
-- 3) Redefinir las 3 RPC con la comparación robusta
--    (mismo cuerpo que la migración 0019, solo cambia cómo se comparan
--    los teléfonos)
-- ------------------------------------------------------------
create or replace function public.send_link_invitation(
  target_phone text default null,
  target_email text default null
)
returns table (
  request_id         uuid,
  matched_user_id     uuid,
  matched_first_name  text,
  matched_last_name   text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id     uuid := auth.uid();
  v_caller_phone  text;
  v_caller_email  text;
  v_matched_id    uuid;
  v_matched_first text;
  v_matched_last  text;
  v_request_id    uuid;
  v_recent_count  int;
begin
  target_email := nullif(lower(trim(target_email)), '');
  target_phone := nullif(trim(target_phone), '');

  if target_phone is null and target_email is null then
    raise exception 'Debes indicar un teléfono o un email.';
  end if;

  select phone, lower(email) into v_caller_phone, v_caller_email
  from public.profiles where id = v_caller_id;

  if (target_email is not null and target_email = v_caller_email)
     or (target_phone is not null and phone_last9(target_phone) = phone_last9(v_caller_phone)) then
    raise exception 'No puedes invitarte a ti mismo.';
  end if;

  -- Límite de invitaciones por hora: frena spam y el margen de "probar
  -- contactos al por mayor" para descubrir quién tiene cuenta.
  select count(*) into v_recent_count
  from public.account_link_requests
  where sender_id = v_caller_id and created_at > now() - interval '1 hour';
  if v_recent_count >= 10 then
    raise exception 'Has enviado demasiadas invitaciones. Inténtalo de nuevo más tarde.';
  end if;

  -- Expira EN EL SITIO cualquier fila pendiente-pero-caducada relevante
  -- para este intento (mía o del destinatario) — así el sistema no depende
  -- de que el barrido periódico (fase futura) ya haya corrido para no
  -- quedarse "atascado" bloqueando un nuevo envío.
  update public.account_link_requests
  set status = 'expired'
  where status = 'pending' and expires_at < now()
    and (
      sender_id = v_caller_id
      or (target_email is not null and recipient_email = target_email)
      or (target_phone is not null and recipient_phone = target_phone)
    );

  if exists (
    select 1 from public.account_link_members
    where user_id = v_caller_id and unlinked_at is null
  ) then
    raise exception 'Ya tienes una cuenta vinculada. Desvincúlala antes de invitar a otra persona.';
  end if;

  if exists (
    select 1 from public.account_link_requests
    where sender_id = v_caller_id and status = 'pending'
  ) then
    raise exception 'Ya tienes una invitación pendiente enviada.';
  end if;

  select id, first_name, last_name into v_matched_id, v_matched_first, v_matched_last
  from public.profiles
  where (target_phone is not null and phone_last9(phone) = phone_last9(target_phone))
     or (target_email is not null and lower(email) = target_email)
  limit 1;

  if v_matched_id is not null and exists (
    select 1 from public.account_link_members
    where user_id = v_matched_id and unlinked_at is null
  ) then
    raise exception 'Esa persona ya tiene una cuenta vinculada.';
  end if;

  begin
    insert into public.account_link_requests (sender_id, recipient_user_id, recipient_phone, recipient_email)
    values (v_caller_id, v_matched_id, target_phone, target_email)
    returning id into v_request_id;
  exception when unique_violation then
    raise exception 'Ya existe una invitación pendiente para ese destinatario.';
  end;

  return query select v_request_id, v_matched_id, v_matched_first, v_matched_last;
end;
$$;

create or replace function public.respond_to_link_invitation(
  target_request_id uuid,
  accept boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id    uuid := auth.uid();
  v_request      public.account_link_requests%rowtype;
  v_caller_phone text;
  v_caller_email text;
  v_new_link_id  uuid;
begin
  select * into v_request
  from public.account_link_requests
  where id = target_request_id
  for update;

  if v_request.id is null then
    raise exception 'Invitación no encontrada.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Esta invitación ya no está pendiente.';
  end if;

  if v_request.expires_at < now() then
    update public.account_link_requests set status = 'expired' where id = v_request.id;
    raise exception 'Esta invitación ha caducado.';
  end if;

  select phone, lower(email) into v_caller_phone, v_caller_email
  from public.profiles where id = v_caller_id;

  if not (
    v_request.recipient_user_id = v_caller_id
    or (v_request.recipient_phone is not null and phone_last9(v_caller_phone) = phone_last9(v_request.recipient_phone))
    or (v_request.recipient_email is not null and v_caller_email = v_request.recipient_email)
  ) then
    raise exception 'No autorizado para responder a esta invitación.';
  end if;

  if not accept then
    update public.account_link_requests
    set status = 'rejected', responded_at = now(), recipient_user_id = coalesce(recipient_user_id, v_caller_id)
    where id = v_request.id;
    return;
  end if;

  if exists (select 1 from public.account_link_members where user_id = v_caller_id and unlinked_at is null) then
    raise exception 'Ya tienes una cuenta vinculada.';
  end if;
  if exists (select 1 from public.account_link_members where user_id = v_request.sender_id and unlinked_at is null) then
    raise exception 'Quien te invitó ya tiene una cuenta vinculada con otra persona.';
  end if;

  insert into public.account_links (created_from_request_id) values (v_request.id) returning id into v_new_link_id;

  begin
    insert into public.account_link_members (link_id, user_id)
    values (v_new_link_id, v_request.sender_id), (v_new_link_id, v_caller_id);
  exception when unique_violation then
    raise exception 'Alguno de los dos ya se vinculó con otra persona mientras tanto.';
  end;

  update public.account_link_requests
  set status = 'accepted', responded_at = now(), recipient_user_id = v_caller_id
  where id = v_request.id;
end;
$$;

create or replace function public.get_my_pending_link_invitations()
returns table (
  request_id        uuid,
  sender_id         uuid,
  sender_first_name text,
  sender_last_name  text,
  sender_avatar_url text,
  created_at        timestamptz,
  expires_at        timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select r.id, s.id, s.first_name, s.last_name, s.avatar_url, r.created_at, r.expires_at
  from public.account_link_requests r
  join public.profiles me on me.id = auth.uid()
  join public.profiles s on s.id = r.sender_id
  where r.status = 'pending'
    and r.expires_at > now()
    and (
      r.recipient_user_id = auth.uid()
      or (r.recipient_phone is not null and phone_last9(me.phone) = phone_last9(r.recipient_phone))
      or (r.recipient_email is not null and lower(me.email) = r.recipient_email)
    );
$$;
