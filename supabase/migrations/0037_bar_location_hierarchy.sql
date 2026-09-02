-- ============================================================
-- Panel de administración: desglose de bares por ubicación
-- ============================================================
-- Los bares solo guardaban latitude/longitude (migración 0003) — para poder
-- agrupar "bares creados" por país/comunidad autónoma/provincia/ciudad sin
-- tener que geocodificar en el cliente cada vez (lento, y con límite de 1
-- petición/segundo en el servicio gratuito que usamos, Nominatim), se
-- guarda el resultado ya calculado en estas cuatro columnas nuevas.
alter table public.bars
  add column country  text,
  add column region   text,
  add column province text,
  add column city      text;

-- ============================================================
-- Trigger: geocodificar un bar nuevo en cuanto se crea
-- ============================================================
-- Mismo patrón que notify_admin_new_custom_drink (migración 0025): un
-- trigger AFTER INSERT llama a una Edge Function vía pg_net (fire-and-forget,
-- no bloquea el insert), usando los secretos ya guardados en Vault. Solo se
-- dispara si el bar tiene coordenadas (si no las tiene, es un bar "privado"
-- sin ubicación — nada que geocodificar).
create or replace function public.request_bar_geocoding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.latitude is not null and new.longitude is not null then
    perform net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/geocode-bar',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('barId', new.id, 'latitude', new.latitude, 'longitude', new.longitude)
    );
  end if;
  return new;
end;
$$;

create trigger on_bar_created_request_geocoding
  after insert on public.bars
  for each row execute function public.request_bar_geocoding();

-- ============================================================
-- RPC: desglose de bares por ubicación, para el panel de administración
-- ============================================================
-- Devuelve una fila por cada combinación distinta de
-- (has_location, country, region, province, city) con su recuento —
-- agregado en SQL para no traer las filas de bares una a una. El cliente
-- decide qué nivel enseñar (país/comunidad autónoma/provincia/ciudad) y va
-- sumando bar_count según haga falta.
-- has_location = false: el bar se creó sin permiso de ubicación (nunca se
-- geocodifica, siempre queda "privado", ver policy bars_select_public_or_own).
-- has_location = true con country null: tiene coordenadas pero la
-- geocodificación todavía no ha terminado (o no encontró nada) — pasajero,
-- se resuelve solo en cuanto el trigger/backfill lo procese.
create function public.get_admin_bars_by_location()
returns table (
  has_location boolean,
  country      text,
  region       text,
  province     text,
  city         text,
  bar_count    bigint
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
    (b.latitude is not null) as has_location,
    b.country,
    b.region,
    b.province,
    b.city,
    count(*) as bar_count
  from public.bars b
  group by 1, 2, 3, 4, 5;
end;
$$;

grant execute on function public.get_admin_bars_by_location() to authenticated;
