-- ============================================================
-- Panel de administración: solicitudes de icono (lista, no solo contador)
-- ============================================================
-- get_admin_dashboard_stats ya cuenta cuántas bebidas "Otro" están sin
-- icono (custom_drinks_pending_icon, migración 0032), pero solo da un
-- número — para poder actuar (subir el dibujo que falta y aplicarlo) hace
-- falta ver el NOMBRE de cada una. Mismo criterio de siempre para "sin
-- icono": catalog_items.icon is null.

create function public.get_pending_icon_requests()
returns table (
  name           text,
  pending_count  bigint
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
  select ci.name, count(*) as pending_count
  from public.catalog_items ci
  where ci.icon is null
  group by ci.name
  order by pending_count desc, ci.name asc;
end;
$$;

grant execute on function public.get_pending_icon_requests() to authenticated;

-- ============================================================
-- RPC: aplicar un icono ya subido a todas las bebidas pendientes con ese
-- nombre (en TODOS los bares, no solo uno) — así, en cuanto el admin sube
-- el dibujo nuevo a drinkIcons.js y publica una actualización, un solo
-- toque en el panel resuelve de golpe todas las filas que estaban
-- esperando ese icono.
-- ============================================================
create function public.apply_icon_to_pending_drinks(p_name text, p_icon text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated bigint;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'No autorizado.';
  end if;

  if p_icon is null or length(trim(p_icon)) = 0 then
    raise exception 'Falta el icono a aplicar.';
  end if;

  update public.catalog_items
  set icon = p_icon
  where name = p_name and icon is null;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

grant execute on function public.apply_icon_to_pending_drinks(text, text) to authenticated;
