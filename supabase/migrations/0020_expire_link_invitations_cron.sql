-- ============================================================
-- Caducidad automática de invitaciones de "vincular cuenta" (Fase D3)
-- ============================================================
-- Hasta ahora, una invitación pendiente pasada de sus 48h solo se marcaba
-- 'expired' de forma PEREZOSA: cuando alguien intentaba responderla (o el
-- propio remitente intentaba mandar otra) — nunca de forma proactiva. Esto
-- programa un barrido cada 15 minutos que llama a la Edge Function
-- `expire-link-invitations` (ver ese fichero: reclama todas las
-- 'pending'+caducadas de golpe, atómico, y avisa por push al remitente de
-- cada una).
--
-- pg_net hace la petición HTTP desde dentro de Postgres; pg_cron decide
-- cuándo. Ninguna de las dos requiere nada especial de Supabase, son
-- extensiones estándar de PostgreSQL que Supabase ya trae listas para
-- activar.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- IMPORTANTE — esto NO funciona solo con aplicar esta migración: hace
-- falta rellenar Vault a mano UNA VEZ, en el SQL Editor, con dos secretos
-- (nunca en un fichero que se suba al repo):
--
--   select vault.create_secret('https://TU-PROJECT-REF.supabase.co', 'project_url');
--   select vault.create_secret('TU-SERVICE-ROLE-KEY', 'service_role_key');
--
-- (el project_url y la service_role_key están en el dashboard de Supabase,
-- Settings → API). Sin esos dos secretos, `cron.schedule` de abajo se
-- programa igualmente, pero cada ejecución del barrido fallará al no saber
-- ni a qué URL llamar ni con qué autorización.
select cron.schedule(
  'expire-link-invitations-sweep',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/expire-link-invitations',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
