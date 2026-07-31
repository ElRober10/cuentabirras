-- Hasta ahora un bar con coordenadas era visible para CUALQUIER usuario en
-- cuanto se creaba (política "latitude is not null or created_by =
-- auth.uid()"). Esto era un bug: un usuario nuevo veía todos los bares
-- creados por otros sin haber hecho nada. A partir de ahora la visibilidad
-- es de pertenencia explícita: solo ves un bar si estás en bar_members
-- (porque lo creaste tú, o porque te uniste a él al detectar que ya
-- existía al intentar crear uno cerca).

create table public.bar_members (
  bar_id     uuid not null references public.bars(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (bar_id, user_id)
);

alter table public.bar_members enable row level security;

create policy "bar_members_select_own"
  on public.bar_members for select
  using (user_id = auth.uid());

grant select on public.bar_members to authenticated;

-- Backfill: sin esto, todos los bares ya creados en producción se
-- quedarían sin ningún miembro y desaparecerían hasta para quien los creó.
-- Se concede pertenencia a quien creó cada bar, y a cualquiera que ya
-- tuviera una cuenta (tab) ahí (para no ocultarle de golpe bares que ya
-- estaba usando activamente).
insert into public.bar_members (bar_id, user_id)
select id, created_by from public.bars
union
select t.bar_id, tp.user_id
from public.tab_participants tp
join public.tabs t on t.id = tp.tab_id
on conflict do nothing;

-- Un bar nuevo se auto-une a quien lo crea (mismo patrón que
-- handle_new_tab/on_tab_created en la migración 0003).
create function public.handle_new_bar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.bar_members (bar_id, user_id) values (new.id, new.created_by);
  return new;
end;
$$;

create trigger on_bar_created
  after insert on public.bars
  for each row execute function public.handle_new_bar();

-- Unirse a un bar ya existente (cuando el usuario, al crear uno nuevo,
-- elige "es este de aquí" en el aviso de bar cercano) — security definer
-- porque el usuario todavía no tiene pertenencia, así que RLS le impediría
-- verlo para insertar la fila él mismo.
create function public.join_bar(target_bar_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.bar_members (bar_id, user_id)
  values (target_bar_id, auth.uid())
  on conflict do nothing;
end;
$$;

grant execute on function public.join_bar(uuid) to authenticated;

-- Detección de bares cercanos (500m) al crear uno: tiene que poder ver
-- bares de los que el usuario todavía NO es miembro (si no, nunca
-- detectaría un duplicado ajeno), así que también necesita security
-- definer. Solo devuelve id/nombre/distancia — nunca coordenadas exactas
-- ni quién lo creó, lo justo para el aviso de "¿es este bar?".
create function public.find_nearby_bars(search_lat double precision, search_lng double precision, radius_meters integer default 500)
returns table (id uuid, name text, distance_meters double precision)
language sql
security definer
set search_path = public
stable
as $$
  with candidates as (
    select
      b.id,
      b.name,
      2 * 6371000 * asin(sqrt(
        sin(radians(b.latitude - search_lat) / 2) ^ 2
        + cos(radians(search_lat)) * cos(radians(b.latitude))
        * sin(radians(b.longitude - search_lng) / 2) ^ 2
      )) as distance_meters
    from public.bars b
    where b.latitude is not null and b.longitude is not null
  )
  select id, name, distance_meters
  from candidates
  where distance_meters <= radius_meters
  order by distance_meters asc;
$$;

grant execute on function public.find_nearby_bars(double precision, double precision, integer) to authenticated;

-- Reemplaza la política de visibilidad de bares: de "tiene coordenadas o
-- es mío" (más la exclusión de hidden_bars) a "soy miembro". hidden_bars
-- deja de usarse para esto (ver más abajo, sustituido por borrar tu propia
-- fila de bar_members al quitar un bar de tu lista) — se deja la tabla tal
-- cual, sin usar, en vez de borrarla, por si hiciera falta consultarla.
drop policy "bars_select_public_or_own" on public.bars;

create policy "bars_select_member"
  on public.bars for select
  using (
    exists (
      select 1 from public.bar_members m
      where m.bar_id = bars.id and m.user_id = auth.uid()
    )
  );

-- catalog_items hereda su visibilidad de la del bar — mismo cambio de
-- predicado en sus 3 políticas.
drop policy "catalog_items_select" on public.catalog_items;
drop policy "catalog_items_insert" on public.catalog_items;
drop policy "catalog_items_update" on public.catalog_items;

create policy "catalog_items_select"
  on public.catalog_items for select
  using (
    exists (
      select 1 from public.bar_members m
      where m.bar_id = catalog_items.bar_id and m.user_id = auth.uid()
    )
  );

create policy "catalog_items_insert"
  on public.catalog_items for insert
  with check (
    updated_by = auth.uid()
    and exists (
      select 1 from public.bar_members m
      where m.bar_id = catalog_items.bar_id and m.user_id = auth.uid()
    )
  );

create policy "catalog_items_update"
  on public.catalog_items for update
  using (
    exists (
      select 1 from public.bar_members m
      where m.bar_id = catalog_items.bar_id and m.user_id = auth.uid()
    )
  )
  with check (updated_by = auth.uid());

-- tabs_select_participant usaba hidden_bars para ocultar tus cuentas de
-- bares que habías quitado de tu lista; ahora el mismo efecto sale gratis
-- comprobando bar_members (si ya no eres miembro, tampoco ves tus cuentas
-- viejas de ese bar).
drop policy "tabs_select_participant" on public.tabs;

create policy "tabs_select_participant"
  on public.tabs for select
  using (
    exists (
      select 1 from public.tab_participants tp
      where tp.tab_id = tabs.id and tp.user_id = auth.uid()
    )
    and exists (
      select 1 from public.bar_members m
      where m.bar_id = tabs.bar_id and m.user_id = auth.uid()
    )
  );

-- remove_bar_for_current_user: "used_by_others" pasa a mirar bar_members
-- (más fiable que tabs.created_by: cubre a cualquier miembro, no solo a
-- quien haya abierto una cuenta). Quitar un bar de tu lista ahora borra tu
-- propia fila de bar_members ("te vas") en vez de insertar en hidden_bars;
-- si eras el único miembro, el bar se borra de verdad, igual que antes.
create or replace function public.remove_bar_for_current_user(target_bar_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  other_members boolean;
begin
  select exists (
    select 1 from public.bar_members
    where bar_id = target_bar_id and user_id <> auth.uid()
  ) into other_members;

  delete from public.bar_members
  where bar_id = target_bar_id and user_id = auth.uid();

  if other_members then
    return 'hidden';
  else
    delete from public.bars where id = target_bar_id;
    return 'deleted';
  end if;
end;
$$;
