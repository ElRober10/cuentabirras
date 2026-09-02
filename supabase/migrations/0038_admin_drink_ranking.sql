-- ============================================================
-- Panel de administración: ranking completo de bebidas más pedidas
-- ============================================================
-- get_admin_dashboard_stats ya calcula la bebida más pedida (una sola,
-- migración 0032) — esto amplía esa cifra suelta a un listado completo,
-- mismo criterio que get_pending_icon_requests (migración 0034): se agrupa
-- por nombre de bebida en TODA la app (no por bar), sumando cuántas
-- unidades se han pedido, de más a menos. Las que no se hayan pedido nunca
-- ni aparecen (el join con tab_items ya las descarta); el "having" de más
-- es solo por si acaso existiera una fila con quantity sumando 0.
create function public.get_admin_drink_ranking()
returns table (
  name          text,
  total_count   bigint
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
  select ci.name, sum(ti.quantity) as total_count
  from public.tab_items ti
  join public.catalog_items ci on ci.id = ti.catalog_item_id
  group by ci.name
  having sum(ti.quantity) > 0
  order by total_count desc, ci.name asc;
end;
$$;

grant execute on function public.get_admin_drink_ranking() to authenticated;
