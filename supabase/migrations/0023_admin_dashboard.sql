-- ============================================================
-- Super admin: panel de administración (Fase 1)
-- ============================================================
-- Un único campo booleano en profiles decide quién es admin — nada de
-- roles/permisos elaborados, de momento solo hace falta UNA cuenta (la del
-- dueño de la app). Se activa a mano por SQL, nunca desde la app (no hay
-- ninguna forma de que un usuario se autoasigne admin).
alter table public.profiles add column is_admin boolean not null default false;

-- ============================================================
-- RPC: cifras del panel de administración
-- ============================================================
-- Toda la autorización vive DENTRO del RPC (comprobando is_admin de quien
-- llama), no en una policy de RLS aparte — mismo espíritu que las Edge
-- Functions de vincular cuenta, que también comprueban "quién llama" a
-- mano en vez de fiarlo todo a RLS. Como cuenta cosas de TODA la app (no
-- solo lo tuyo), tiene que ser security definer.
create or replace function public.get_admin_dashboard_stats()
returns table (
  total_users     bigint,
  total_bars      bigint,
  total_tabs      bigint,
  total_drinks    bigint
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
  select
    (select count(*) from public.profiles),
    (select count(*) from public.bars),
    (select count(*) from public.tabs),
    (select coalesce(sum(quantity), 0) from public.tab_items);
end;
$$;

grant execute on function public.get_admin_dashboard_stats() to authenticated;

-- ============================================================
-- Activa tu propia cuenta como admin — EJECUTA ESTO A MANO, UNA VEZ,
-- cambiando el email si hiciera falta (ya viene con el tuyo puesto):
-- ============================================================
-- update public.profiles set is_admin = true where email = 'roberto_sanz10@hotmail.com';
