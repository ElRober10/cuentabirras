-- ============================================================
-- Panel de administración: más estadísticas (ampliación de la Fase 1)
-- ============================================================
-- Se amplía get_admin_dashboard_stats con cifras más útiles: crecimiento
-- reciente, cuentas vinculadas activas (parejas), la bebida más pedida de
-- toda la app, y cuántas bebidas "Otro" siguen sin icono (ya se avisa por
-- push al crearlas, migración 0025, pero un contador en el panel ayuda a
-- ver de un vistazo si hay varias acumuladas). Hay que borrar la función y
-- volver a crearla entera (no basta con "create or replace") porque
-- Postgres no deja cambiar la lista de columnas que devuelve una función
-- ya existente sin borrarla primero.
drop function public.get_admin_dashboard_stats();

create function public.get_admin_dashboard_stats()
returns table (
  total_users                bigint,
  total_bars                 bigint,
  total_tabs                 bigint,
  total_drinks                bigint,
  new_users_last_7_days       bigint,
  active_linked_accounts      bigint,
  top_drink_name              text,
  top_drink_count             bigint,
  custom_drinks_pending_icon  bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_top_drink record;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'No autorizado.';
  end if;

  -- Se calcula aparte (no como dos subconsultas repetidas en el select de
  -- abajo) para que nombre y cantidad salgan siempre de la MISMA fila —
  -- con dos subconsultas separadas, un empate en la suma podría hacer que
  -- cada una "limit 1" eligiera una bebida distinta.
  select ci.name, sum(ti.quantity) as total
  into v_top_drink
  from public.tab_items ti
  join public.catalog_items ci on ci.id = ti.catalog_item_id
  group by ci.name
  order by total desc
  limit 1;

  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.bars),
    (select count(*) from public.tabs),
    (select coalesce(sum(quantity), 0) from public.tab_items),
    (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    (select count(*) from public.account_links where unlinked_at is null),
    v_top_drink.name,
    coalesce(v_top_drink.total, 0),
    (select count(*) from public.catalog_items where icon is null);
end;
$$;

grant execute on function public.get_admin_dashboard_stats() to authenticated;
