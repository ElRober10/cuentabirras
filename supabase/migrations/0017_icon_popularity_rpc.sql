-- Para ordenar el SELECTOR de iconos (el que abre el botón +, antes de
-- saber si esa bebida ya existe en el catálogo de este bar en concreto)
-- hace falta la popularidad del ICONO en sí, en TODA la app — no la de un
-- catalog_item de un bar concreto (eso ya lo cubre
-- get_catalog_item_popularity, migración 0013).
--
-- Igual que aquella: "security definer" para poder sumar entre todos los
-- usuarios, pero solo devuelve números agregados por icono, nunca quién
-- pidió qué.
create or replace function public.get_icon_popularity()
returns table (icon text, my_quantity bigint, total_quantity bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    ci.icon,
    coalesce(sum(ti.quantity) filter (where ti.added_by = auth.uid()), 0) as my_quantity,
    coalesce(sum(ti.quantity), 0) as total_quantity
  from public.tab_items ti
  join public.catalog_items ci on ci.id = ti.catalog_item_id
  where ci.icon is not null
  group by ci.icon;
$$;

grant execute on function public.get_icon_popularity() to authenticated;
