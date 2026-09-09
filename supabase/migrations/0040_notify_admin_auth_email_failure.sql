-- ============================================================
-- Aviso al admin: fallo al enviar un email de autenticación
-- ============================================================
-- Los emails de auth (confirmar registro, recuperar contraseña, cambiar
-- email de acceso) los manda el servidor de Supabase (GoTrue) vía el SMTP
-- que hay configurado (ahora Brevo, plan gratis 300/día). Cuando ese envío
-- falla —se agota la cuota diaria de Brevo, el SMTP está mal, Brevo caído—
-- GoTrue devuelve un 500 y la creación del usuario se revierte por
-- completo: NO se inserta nada en auth.users, así que el trigger
-- handle_new_user NUNCA se dispara y no hay forma de enterarse desde dentro
-- de Postgres. La detección tiene que venir del cliente (ver
-- SupabaseAuthRepository.js), que al ver ese error llama al RPC de abajo.
--
-- Mismo patrón de aviso que la migración 0025 (bebida "Otro" sin icono):
-- pg_net -> Edge Function -> push a los admin. La diferencia es que aquí
-- quien dispara es la app SIN sesión (el usuario está intentando
-- registrarse), así que el RPC se concede a `anon`.

-- ============================================================
-- Tabla: registro de incidencias
-- ============================================================
-- Sin policies: solo se escribe vía el RPC report_auth_email_failure
-- (security definer) y solo se lee vía get_admin_auth_email_failures
-- (security definer, comprueba is_admin). Igual de cerrada que
-- account_links / tab_participants.
create table public.auth_email_failures (
  id          uuid primary key default gen_random_uuid(),
  -- 'signup' | 'password_reset' | 'email_change' — el flujo desde el que
  -- se detectó el fallo (lo manda el cliente).
  flow        text not null check (flow in ('signup', 'password_reset', 'email_change')),
  -- El email al que se intentaba enviar. Puede venir null: en recuperar
  -- contraseña el cliente no siempre lo tiene a mano y, sobre todo, así el
  -- admin no acumula un listado de emails de gente que ni llegó a
  -- registrarse. Se guarda solo como pista para diagnosticar.
  email       text,
  created_at  timestamptz not null default now()
);

alter table public.auth_email_failures enable row level security;

create index auth_email_failures_created_at_idx
  on public.auth_email_failures (created_at desc);

-- ============================================================
-- RPC: report_auth_email_failure — lo llama el cliente al detectar el fallo
-- ============================================================
-- security definer para poder insertar en una tabla sin policies y leer
-- vault. Se concede a anon Y authenticated (el registro no tiene sesión;
-- recuperar contraseña / cambiar email sí).
create function public.report_auth_email_failure(p_flow text, p_email text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_count bigint;
begin
  if p_flow is null or p_flow not in ('signup', 'password_reset', 'email_change') then
    raise exception 'flow no válido';
  end if;

  insert into public.auth_email_failures (flow, email)
  values (p_flow, nullif(trim(p_email), ''));

  -- Anti-spam: si ya hubo otra incidencia en los últimos 15 minutos, la
  -- fila queda igualmente registrada (para el panel) pero NO se manda otro
  -- push — el admin ya está avisado y un pico de registros fallidos no
  -- debe convertirse en una lluvia de notificaciones.
  select count(*) into v_recent_count
  from public.auth_email_failures
  where created_at > now() - interval '15 minutes';

  if v_recent_count = 1 then
    perform net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/notify-admin-auth-email-failure',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('flow', p_flow)
    );
  end if;
end;
$$;

grant execute on function public.report_auth_email_failure(text, text) to anon, authenticated;

-- ============================================================
-- RPC: get_admin_auth_email_failures — listado para el panel
-- ============================================================
create function public.get_admin_auth_email_failures()
returns table (
  flow        text,
  email       text,
  created_at  timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'No autorizado.';
  end if;

  return query
  select f.flow, f.email, f.created_at
  from public.auth_email_failures f
  where f.created_at > now() - interval '30 days'
  order by f.created_at desc;
end;
$$;

grant execute on function public.get_admin_auth_email_failures() to authenticated;
