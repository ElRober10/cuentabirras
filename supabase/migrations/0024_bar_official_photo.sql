-- ============================================================
-- Foto oficial de bar (Fase admin): respaldo para quien no tenga la suya
-- ============================================================
-- bar_photos es 100% privada (RLS solo deja ver tu propia fila, ver
-- migración 0003) — a propósito, para que dos usuarios del mismo bar nunca
-- vean la foto del otro. Una foto "oficial" es justo lo contrario: la pone
-- SOLO el admin, pero la ve CUALQUIERA que vea el bar. Por eso necesita su
-- propia tabla, no encaja en bar_photos.
create table public.bar_official_photos (
  bar_id      uuid primary key references public.bars(id) on delete cascade,
  photo_path  text not null,
  set_by      uuid references public.profiles(id),
  updated_at  timestamptz not null default now()
);

alter table public.bar_official_photos enable row level security;

-- Visible para cualquiera que sea miembro del bar (misma visibilidad que el
-- catálogo, por ejemplo) — no es un dato privado, es la foto de referencia.
create policy "bar_official_photos_select"
  on public.bar_official_photos for select
  using (
    exists (
      select 1 from public.bar_members m
      where m.bar_id = bar_official_photos.bar_id and m.user_id = auth.uid()
    )
  );

-- Solo el admin puede ponerla/cambiarla/quitarla.
create policy "bar_official_photos_admin_write"
  on public.bar_official_photos for all
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

grant select, insert, update, delete on public.bar_official_photos to authenticated;

-- ============================================================
-- Storage: carpeta "official/" dentro del mismo bucket "bar-photos"
-- ============================================================
-- La política de la migración 0004 exige que la primera carpeta de la ruta
-- sea TU PROPIO user id — así que una foto compartida no puede vivir en la
-- carpeta de nadie en concreto. Se usa una carpeta fija "official/" en su
-- lugar, con sus propias reglas: cualquiera autenticado puede LEER lo que
-- haya ahí (no es dato privado), pero solo el admin puede escribir.
create policy "bar_photos_storage_official_select"
  on storage.objects
  for select
  using (bucket_id = 'bar-photos' and (storage.foldername(name))[1] = 'official');

create policy "bar_photos_storage_official_admin_write"
  on storage.objects
  for all
  using (
    bucket_id = 'bar-photos'
    and (storage.foldername(name))[1] = 'official'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  )
  with check (
    bucket_id = 'bar-photos'
    and (storage.foldername(name))[1] = 'official'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );
