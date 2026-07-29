-- ============================================================
-- BARES
-- ============================================================
create table public.bars (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  address       text,
  -- Opcionales: si el usuario no da permiso de ubicación al crear el bar,
  -- se quedan en null y el bar pasa a ser "privado" (ver policy de select).
  latitude      double precision,
  longitude     double precision,
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now()
);

alter table public.bars enable row level security;

-- Un bar es "público" (visible para cualquiera) si tiene ubicación guardada;
-- si no tiene ubicación, solo lo ve quien lo creó ("privado"). No hace falta
-- una columna aparte para esto, se deriva directamente de latitude/longitude.
create policy "bars_select_public_or_own"
  on public.bars for select
  using (latitude is not null or created_by = auth.uid());

create policy "bars_insert_own"
  on public.bars for insert
  with check (created_by = auth.uid());

-- ============================================================
-- CATÁLOGO DE PRECIOS (colaborativo, por bar)
-- ============================================================
create table public.catalog_items (
  id            uuid primary key default gen_random_uuid(),
  bar_id        uuid not null references public.bars(id) on delete cascade,
  name          text not null,
  price_cents   integer not null check (price_cents >= 0),
  currency      text not null default 'EUR',
  updated_by    uuid references public.profiles(id),
  updated_at    timestamptz not null default now(),
  -- Para más adelante: si dos personas offline crean/editan el mismo precio
  -- a la vez, "version" permite detectar el conflicto (no se usa todavía).
  version       integer not null default 1,
  unique (bar_id, name)
);

alter table public.catalog_items enable row level security;

-- El catálogo hereda la visibilidad de su bar: si puedes ver el bar (es
-- público, o es tuyo privado), puedes ver su catálogo de precios.
create policy "catalog_items_select"
  on public.catalog_items for select
  using (
    exists (
      select 1 from public.bars b
      where b.id = catalog_items.bar_id
        and (b.latitude is not null or b.created_by = auth.uid())
    )
  );

-- Colaborativo: cualquiera que vea el bar puede añadir precios nuevos.
create policy "catalog_items_insert"
  on public.catalog_items for insert
  with check (
    updated_by = auth.uid()
    and exists (
      select 1 from public.bars b
      where b.id = catalog_items.bar_id
        and (b.latitude is not null or b.created_by = auth.uid())
    )
  );

-- Colaborativo también al editar (p. ej. corregir un precio desactualizado).
create policy "catalog_items_update"
  on public.catalog_items for update
  using (
    exists (
      select 1 from public.bars b
      where b.id = catalog_items.bar_id
        and (b.latitude is not null or b.created_by = auth.uid())
    )
  )
  with check (updated_by = auth.uid());

-- ============================================================
-- CUENTAS (tabs) Y SUS PARTICIPANTES
-- ============================================================
create table public.tabs (
  id            uuid primary key default gen_random_uuid(),
  bar_id        uuid not null references public.bars(id),
  status        text not null check (status in ('open', 'closed')) default 'open',
  split_mode    text not null check (split_mode in ('per_consumer', 'equal_split')) default 'per_consumer',
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now(),
  closed_at     timestamptz
);

-- Quién está vinculado a una cuenta. En la Fase 1 solo estará el creador
-- (se rellena solo, ver el trigger de más abajo); en la Fase 3 se añadirán
-- más personas mediante invitaciones.
create table public.tab_participants (
  tab_id        uuid not null references public.tabs(id) on delete cascade,
  user_id       uuid not null references public.profiles(id),
  joined_at     timestamptz not null default now(),
  primary key (tab_id, user_id)
);

alter table public.tabs enable row level security;
alter table public.tab_participants enable row level security;

-- Solo puedes ver/editar cuentas en las que estás vinculado como participante.
create policy "tabs_select_participant"
  on public.tabs for select
  using (
    exists (
      select 1 from public.tab_participants tp
      where tp.tab_id = tabs.id and tp.user_id = auth.uid()
    )
  );

create policy "tabs_insert_own"
  on public.tabs for insert
  with check (created_by = auth.uid());

-- Necesario para poder cerrar la cuenta (cambiar status a 'closed').
create policy "tabs_update_participant"
  on public.tabs for update
  using (
    exists (
      select 1 from public.tab_participants tp
      where tp.tab_id = tabs.id and tp.user_id = auth.uid()
    )
  );

-- Puedes ver tu propia fila en tab_participants (para saber a qué cuentas
-- estás vinculado). No hay policy de insert: nadie puede añadirse a sí mismo
-- ni a otros directamente desde el cliente — solo lo hace el trigger de
-- abajo (al crear la cuenta) o, en la Fase 3, una función RPC controlada al
-- aceptar una invitación.
create policy "tab_participants_select_own"
  on public.tab_participants for select
  using (user_id = auth.uid());

-- Al crear una cuenta, se añade automáticamente a su creador como
-- participante (mismo patrón que el trigger de profiles en la migración 0001).
create function public.handle_new_tab()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tab_participants (tab_id, user_id) values (new.id, new.created_by);
  return new;
end;
$$;

create trigger on_tab_created
  after insert on public.tabs
  for each row execute function public.handle_new_tab();

-- ============================================================
-- BEBIDAS AÑADIDAS A UNA CUENTA
-- ============================================================
create table public.tab_items (
  id                    uuid primary key default gen_random_uuid(),
  tab_id                uuid not null references public.tabs(id) on delete cascade,
  catalog_item_id       uuid not null references public.catalog_items(id),
  added_by              uuid not null references public.profiles(id),
  -- El precio se "congela" en el momento de añadir la bebida: si luego
  -- alguien cambia el precio del catálogo, el histórico de esta cuenta no
  -- se ve afectado.
  price_cents_at_add    integer not null,
  quantity              integer not null default 1 check (quantity > 0),
  created_at            timestamptz not null default now()
);

alter table public.tab_items enable row level security;

create policy "tab_items_select_participant"
  on public.tab_items for select
  using (
    exists (
      select 1 from public.tab_participants tp
      where tp.tab_id = tab_items.tab_id and tp.user_id = auth.uid()
    )
  );

-- Solo puedes añadir bebidas a cuentas donde participas, y solo mientras
-- la cuenta siga abierta (no se puede tocar el histórico de una cerrada).
create policy "tab_items_insert_participant"
  on public.tab_items for insert
  with check (
    added_by = auth.uid()
    and exists (
      select 1 from public.tab_participants tp
      where tp.tab_id = tab_items.tab_id and tp.user_id = auth.uid()
    )
    and exists (
      select 1 from public.tabs t
      where t.id = tab_items.tab_id and t.status = 'open'
    )
  );

-- Solo puedes editar/borrar lo que TÚ añadiste, y solo si la cuenta sigue abierta.
create policy "tab_items_update_own"
  on public.tab_items for update
  using (
    added_by = auth.uid()
    and exists (select 1 from public.tabs t where t.id = tab_items.tab_id and t.status = 'open')
  );

create policy "tab_items_delete_own"
  on public.tab_items for delete
  using (
    added_by = auth.uid()
    and exists (select 1 from public.tabs t where t.id = tab_items.tab_id and t.status = 'open')
  );

-- ============================================================
-- FOTO PERSONAL DE BAR (privada, no colaborativa)
-- ============================================================
create table public.bar_photos (
  id            uuid primary key default gen_random_uuid(),
  bar_id        uuid not null references public.bars(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  -- Ruta del archivo dentro del bucket de Storage "bar-photos" (se configura
  -- en un paso aparte), no la imagen en sí.
  photo_path    text not null,
  created_at    timestamptz not null default now(),
  unique (bar_id, user_id)
);

alter table public.bar_photos enable row level security;

-- A diferencia del catálogo (colaborativo), esto es 100% privado: cada
-- usuario solo puede ver/tocar SU PROPIA foto, nunca la de otro.
create policy "bar_photos_own"
  on public.bar_photos for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- PERMISOS BASE (igual que en la migración 0002: "Automatically expose new
-- tables" está desactivado, así que hay que concederlos a mano)
-- ============================================================
grant select, insert on public.bars to authenticated;
grant select, insert, update on public.catalog_items to authenticated;
grant select, insert, update on public.tabs to authenticated;
grant select on public.tab_participants to authenticated;
grant select, insert, update, delete on public.tab_items to authenticated;
grant select, insert, update, delete on public.bar_photos to authenticated;
