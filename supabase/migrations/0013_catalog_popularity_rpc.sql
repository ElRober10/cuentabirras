-- Para ordenar las tarjetas de bebidas (primero lo que más pides TÚ, luego
-- lo que más pide el grupo entero) hace falta sumar cantidades de
-- tab_items de TODAS las cuentas de este bar, no solo las tuyas — pero la
-- política de tab_items solo te deja ver las cuentas donde participas, así
-- que un select normal no llegaría a los datos de los demás.
--
-- Esta función, al ser "security definer", sí puede leer todas las filas
-- para calcular la suma, pero solo devuelve NÚMEROS agregados (cuánto se
-- pidió en total de cada bebida), nunca quién pidió qué — no se filtra
-- ningún dato privado de otros usuarios.
create or replace function public.get_catalog_item_popularity(target_bar_id uuid)
returns table (catalog_item_id uuid, my_quantity bigint, total_quantity bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    ti.catalog_item_id,
    coalesce(sum(ti.quantity) filter (where ti.added_by = auth.uid()), 0) as my_quantity,
    coalesce(sum(ti.quantity), 0) as total_quantity
  from public.tab_items ti
  join public.tabs t on t.id = ti.tab_id
  where t.bar_id = target_bar_id
  group by ti.catalog_item_id;
$$;

grant execute on function public.get_catalog_item_popularity(uuid) to authenticated;
