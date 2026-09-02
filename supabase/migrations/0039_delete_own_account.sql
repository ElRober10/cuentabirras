-- Borrado de cuenta iniciado por el propio usuario (App Store guideline
-- 5.1.1(v) y Google Play). El cliente llama a este RPC y después a
-- supabase.auth.signOut().
--
-- profiles.id -> auth.users(id) es "on delete cascade", pero varias FKs
-- apuntan a profiles(id) SIN cascada y con NOT NULL (bars.created_by,
-- tabs.created_by, tab_participants.user_id, tab_items.added_by), así que un
-- "delete from auth.users" a secas fallaría por violación de FK. Esta
-- función limpia esas referencias en orden antes del borrado final.
--
-- Las aportaciones al catálogo colaborativo (catalog_items.updated_by) se
-- CONSERVAN, poniendo updated_by a null: es dato compartido en el que
-- confían el resto de usuarios del bar.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado.';
  end if;

  -- 1. Cerrar el vínculo de pareja activo (si lo hay). La fila de la OTRA
  --    persona en account_link_members no cascadea al borrar este usuario y
  --    se quedaría "activa" (unlinked_at is null), bloqueándole vincular otra
  --    cuenta. Cerramos las dos filas del link y el propio account_links.
  update public.account_link_members m
  set unlinked_at = now()
  where m.unlinked_at is null
    and m.link_id in (
      select me.link_id
      from public.account_link_members me
      where me.user_id = v_uid and me.unlinked_at is null
    );

  update public.account_links l
  set unlinked_at = now(), unlinked_by = v_uid
  where l.unlinked_at is null
    and l.id in (
      select me.link_id
      from public.account_link_members me
      where me.user_id = v_uid
    );

  -- 2. account_links.unlinked_by es FK a profiles sin cascada: soltar las
  --    referencias de vínculos que este usuario cerró en el pasado.
  update public.account_links
  set unlinked_by = null
  where unlinked_by = v_uid;

  -- 3. bar_official_photos.set_by es FK a profiles sin cascada (nullable).
  update public.bar_official_photos
  set set_by = null
  where set_by = v_uid;

  -- 4. Bares creados por el usuario:
  --    a) si hay otro miembro, se traspasa created_by al más antiguo;
  update public.bars b
  set created_by = (
    select bm.user_id
    from public.bar_members bm
    where bm.bar_id = b.id and bm.user_id <> v_uid
    order by bm.joined_at asc
    limit 1
  )
  where b.created_by = v_uid
    and exists (
      select 1 from public.bar_members bm
      where bm.bar_id = b.id and bm.user_id <> v_uid
    );

  --    b) los que quedan (sin ningún otro miembro) se borran; la cascada se
  --       lleva catalog_items, bar_members, bar_photos, bar_official_photos,
  --       y tabs -> tab_items, tab_participants de ese bar.
  delete from public.bars b
  where b.created_by = v_uid;

  -- 5. Cuentas (tabs) creadas por el usuario que hayan sobrevivido (en bares
  --    de otros): traspasar a otro participante, o borrar si no queda nadie.
  update public.tabs t
  set created_by = (
    select tp.user_id
    from public.tab_participants tp
    where tp.tab_id = t.id and tp.user_id <> v_uid
    order by tp.joined_at asc
    limit 1
  )
  where t.created_by = v_uid
    and exists (
      select 1 from public.tab_participants tp
      where tp.tab_id = t.id and tp.user_id <> v_uid
    );

  delete from public.tabs t
  where t.created_by = v_uid;

  -- 6. Consumiciones que añadió el usuario en cuentas ajenas/compartidas que
  --    sobreviven (tab_items.added_by es NOT NULL, no admite null).
  delete from public.tab_items
  where added_by = v_uid;

  -- 7. Quitar al usuario como participante de las cuentas compartidas que quedan.
  delete from public.tab_participants
  where user_id = v_uid;

  -- 8. Conservar las aportaciones al catálogo, anonimizadas.
  update public.catalog_items
  set updated_by = null
  where updated_by = v_uid;

  -- 9. Borrado final. Cascada: profiles, bar_members, bar_photos,
  --    account_link_members, account_link_requests (sender_id y recipient_user_id).
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
