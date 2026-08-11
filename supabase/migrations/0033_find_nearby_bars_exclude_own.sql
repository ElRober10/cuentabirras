-- ============================================================
-- find_nearby_bars: no enseñar bares de los que ya eres miembro
-- ============================================================
-- Esta función se usa en dos sitios: el aviso de "¿es este bar?" al crear
-- uno (findNearbyPublicBar.js), y ahora también en la nueva pantalla de
-- "Nuevo bar" (2026-08-11), que enseña bares cercanos para poder unirte
-- directamente en vez de crear uno duplicado. En los dos casos no tiene
-- sentido sugerir un bar del que YA eres miembro — solo confunde, y
-- unirte de nuevo no haría nada (join_bar ya ignora duplicados).
create or replace function public.find_nearby_bars(search_lat double precision, search_lng double precision, radius_meters integer default 500)
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
      and not exists (
        select 1 from public.bar_members m
        where m.bar_id = b.id and m.user_id = auth.uid()
      )
  )
  select id, name, distance_meters
  from candidates
  where distance_meters <= radius_meters
  order by distance_meters asc;
$$;
