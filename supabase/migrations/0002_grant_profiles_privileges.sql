-- Como "Automatically expose new tables" está desactivado (a propósito, por seguridad),
-- hay que conceder explícitamente el permiso base de tabla a los usuarios autenticados.
-- Las políticas de RLS ya creadas siguen limitando qué filas concretas se pueden tocar.
grant usage on schema public to authenticated, anon;
grant select, update on public.profiles to authenticated;
