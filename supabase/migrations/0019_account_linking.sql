-- ============================================================
-- "Vincular cuenta" — invitación 1:1 entre dos usuarios
-- ============================================================
-- Dos usuarios pueden enlazar sus cuentas (como una pareja compartiendo
-- fondo común) mediante invitación que la otra persona debe aceptar. Solo
-- puedes estar vinculado a UNA persona a la vez.
--
-- DISEÑO: en vez de una tabla "account_links" con dos columnas
-- user_a/user_b (con las que Postgres NO puede expresar "cada usuario
-- aparece en como mucho una fila activa" como restricción real: un índice
-- único en una sola columna no impide que ese mismo usuario aparezca en la
-- OTRA columna de otra fila), usamos el mismo patrón que bar_members: una
-- tabla de "miembros" (account_link_members) con un ÍNDICE ÚNICO PARCIAL en
-- user_id (solo contando filas activas). Eso sí es una garantía real de la
-- base de datos, no solo una comprobación en el RPC que podría perder una
-- carrera entre dos peticiones simultáneas.
--
-- account_links guarda el enlace en sí (casi vacía) y NO se borra al
-- desvincular (se rellena unlinked_at) — así queda historial sin tabla aparte.
--
-- account_links / account_link_members: sin ninguna policy ni grant —solo
-- se accede vía los RPC de abajo (mismo espíritu que tab_participants: nadie
-- se vincula a sí mismo ni a otros directamente desde el cliente).
--
-- account_link_requests SÍ tiene policies de SELECT (el remitente ve las
-- que envió; el destinatario ve las suyas incluso ANTES de resolver
-- recipient_user_id, por coincidencia de su propio teléfono/email — esto es
-- lo que permite que una invitación a alguien no registrado se vea sola en
-- cuanto esa persona se registre). Sin policies de insert/update/delete:
-- toda escritura pasa por send_link_invitation / respond_to_link_invitation
-- / cancel_link_invitation (security definer), que validan reglas de
-- negocio que un insert/update directo del cliente se saltaría.

-- ============================================================
-- account_link_requests: las invitaciones
-- ============================================================
create table public.account_link_requests (
  id                uuid primary key default gen_random_uuid(),
  sender_id         uuid not null references public.profiles(id) on delete cascade,
  -- Se rellena en cuanto se resuelve quién es el destinatario: al crearla
  -- (si ya existía perfil con ese teléfono/email) o al responder (si se
  -- registró después).
  recipient_user_id uuid references public.profiles(id) on delete cascade,
  recipient_phone   text,
  recipient_email   text,
  status            text not null default 'pending'
                       check (status in ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null default (now() + interval '48 hours'),
  responded_at      timestamptz,
  check (recipient_user_id is not null or recipient_phone is not null or recipient_email is not null),
  check (sender_id <> recipient_user_id)
);

create index account_link_requests_sender_idx on public.account_link_requests (sender_id);
create index account_link_requests_recipient_user_idx on public.account_link_requests (recipient_user_id);
create index account_link_requests_recipient_email_idx on public.account_link_requests (recipient_email);
create index account_link_requests_recipient_phone_idx on public.account_link_requests (recipient_phone);
-- Usado por el futuro barrido de caducidad (Fase D3): todas las 'pending' cuyo plazo pasó.
create index account_link_requests_status_expires_idx on public.account_link_requests (status, expires_at);

-- Garantía de base de datos contra invitaciones pendientes duplicadas hacia
-- el MISMO destino, sin importar quién la envíe.
create unique index account_link_requests_pending_recipient_user_idx
  on public.account_link_requests (recipient_user_id)
  where (status = 'pending' and recipient_user_id is not null);

create unique index account_link_requests_pending_recipient_email_idx
  on public.account_link_requests (recipient_email)
  where (status = 'pending' and recipient_user_id is null and recipient_email is not null);

create unique index account_link_requests_pending_recipient_phone_idx
  on public.account_link_requests (recipient_phone)
  where (status = 'pending' and recipient_user_id is null and recipient_phone is not null);

alter table public.account_link_requests enable row level security;

create policy "link_requests_select_sender"
  on public.account_link_requests for select
  using (sender_id = auth.uid());

create policy "link_requests_select_recipient"
  on public.account_link_requests for select
  using (
    recipient_user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          (account_link_requests.recipient_phone is not null and p.phone = account_link_requests.recipient_phone)
          or (account_link_requests.recipient_email is not null and lower(p.email) = account_link_requests.recipient_email)
        )
    )
  );

grant select on public.account_link_requests to authenticated;

-- ============================================================
-- account_links + account_link_members: el enlace activo
-- ============================================================
create table public.account_links (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  created_from_request_id uuid references public.account_link_requests(id) on delete set null,
  unlinked_at             timestamptz,
  unlinked_by             uuid references public.profiles(id)
);

create table public.account_link_members (
  link_id     uuid not null references public.account_links(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  unlinked_at timestamptz,
  primary key (link_id, user_id)
);

-- LA restricción de "1:1" real (no solo de código): un usuario no puede
-- tener más de una fila ACTIVA aquí, sin importar en qué link_id esté.
create unique index account_link_members_one_active_per_user
  on public.account_link_members (user_id)
  where (unlinked_at is null);

alter table public.account_links enable row level security;
alter table public.account_link_members enable row level security;
-- Deliberadamente sin policies ni grants: acceso exclusivo vía RPC.

-- ============================================================
-- RPC: enviar invitación
-- ============================================================
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
     or (target_phone is not null and target_phone = v_caller_phone) then
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
  where (target_phone is not null and regexp_replace(phone, '[^0-9+]', '', 'g') = regexp_replace(target_phone, '[^0-9+]', '', 'g'))
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

grant execute on function public.send_link_invitation(text, text) to authenticated;

-- ============================================================
-- RPC: responder a una invitación (aceptar/rechazar)
-- ============================================================
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
    or (v_request.recipient_phone is not null and regexp_replace(v_caller_phone, '[^0-9+]', '', 'g') = regexp_replace(v_request.recipient_phone, '[^0-9+]', '', 'g'))
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

grant execute on function public.respond_to_link_invitation(uuid, boolean) to authenticated;

-- ============================================================
-- RPC: cancelar mi propia invitación enviada
-- ============================================================
create or replace function public.cancel_link_invitation(target_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.account_link_requests
  set status = 'cancelled', responded_at = now()
  where id = target_request_id and sender_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'No se pudo cancelar (no es tuya o ya no está pendiente).';
  end if;
end;
$$;

grant execute on function public.cancel_link_invitation(uuid) to authenticated;

-- ============================================================
-- RPC: desvincular
-- ============================================================
create or replace function public.unlink_account(target_link_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
begin
  if not exists (
    select 1 from public.account_link_members
    where link_id = target_link_id and user_id = v_caller_id and unlinked_at is null
  ) then
    raise exception 'No perteneces a esa cuenta vinculada.';
  end if;

  update public.account_link_members
  set unlinked_at = now()
  where link_id = target_link_id and unlinked_at is null;

  update public.account_links
  set unlinked_at = now(), unlinked_by = v_caller_id
  where id = target_link_id and unlinked_at is null;
end;
$$;

grant execute on function public.unlink_account(uuid) to authenticated;

-- ============================================================
-- RPC: leer mi enlace activo (o ninguna fila si no estás vinculado)
-- ============================================================
create or replace function public.get_my_account_link()
returns table (
  link_id            uuid,
  linked_since       timestamptz,
  partner_id         uuid,
  partner_first_name text,
  partner_last_name  text,
  partner_avatar_url text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    l.id,
    l.created_at,
    p.id,
    p.first_name,
    p.last_name,
    p.avatar_url
  from public.account_link_members me
  join public.account_link_members other
    on other.link_id = me.link_id and other.user_id <> me.user_id and other.unlinked_at is null
  join public.account_links l on l.id = me.link_id
  join public.profiles p on p.id = other.user_id
  where me.user_id = auth.uid() and me.unlinked_at is null;
$$;

grant execute on function public.get_my_account_link() to authenticated;

-- ============================================================
-- RPC: mi invitación pendiente enviada (para el botón cancelar en Ajustes)
-- ============================================================
create or replace function public.get_my_sent_link_invitation()
returns table (
  request_id           uuid,
  recipient_user_id    uuid,
  recipient_first_name text,
  recipient_last_name  text,
  recipient_phone      text,
  recipient_email      text,
  created_at           timestamptz,
  expires_at           timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select r.id, r.recipient_user_id, p.first_name, p.last_name, r.recipient_phone, r.recipient_email,
         r.created_at, r.expires_at
  from public.account_link_requests r
  left join public.profiles p on p.id = r.recipient_user_id
  where r.sender_id = auth.uid() and r.status = 'pending'
  order by r.created_at desc
  limit 1;
$$;

grant execute on function public.get_my_sent_link_invitation() to authenticated;

-- ============================================================
-- RPC: invitaciones pendientes dirigidas a mí (se llama en cada login)
-- ============================================================
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
      or (r.recipient_phone is not null and regexp_replace(me.phone, '[^0-9+]', '', 'g') = regexp_replace(r.recipient_phone, '[^0-9+]', '', 'g'))
      or (r.recipient_email is not null and lower(me.email) = r.recipient_email)
    );
$$;

grant execute on function public.get_my_pending_link_invitations() to authenticated;
