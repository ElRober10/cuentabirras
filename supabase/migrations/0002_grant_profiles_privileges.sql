-- Este archivo arregla el error real que nos dio "permission denied for
-- table profiles" al probar el registro por primera vez.
--
-- Hay DOS capas de seguridad distintas en Postgres/Supabase, y son
-- independientes entre sí:
--   1. GRANT: "¿puede este rol tocar esta tabla EN ABSOLUTO?" (más básico)
--   2. RLS/policies (migración 0001): "de las filas que puede tocar, ¿CUÁLES en concreto?"
-- Si falta el GRANT, ni siquiera se llega a mirar las policies — Postgres
-- deniega el acceso antes. Al crear el proyecto de Supabase, desactivamos a
-- propósito la opción "Automatically expose new tables" (para que nada
-- quede expuesto a la API sin que nosotros lo decidamos explícitamente), así
-- que ahora nos toca dar este permiso a mano.
--
-- "authenticated" y "anon" son los dos roles que usa la API de Supabase:
-- `anon` para peticiones sin login, `authenticated` para peticiones con un
-- usuario logueado (nuestro caso, ya que profiles solo se puede leer/editar
-- estando logueado, según las policies de RLS).
grant usage on schema public to authenticated, anon;
grant select, update on public.profiles to authenticated;
