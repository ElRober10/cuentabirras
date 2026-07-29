-- Mismo tipo de arreglo que la migración 0007 (tabs.bar_id), pero para otra
-- relación que también le faltaba "on delete cascade": al borrar un bar,
-- se borra su catálogo de bebidas (catalog_items), pero las filas de
-- tab_items que apuntaban a esas bebidas no tenían permiso para borrarse
-- también, y Postgres bloqueaba todo el borrado para no dejar referencias
-- rotas.
alter table public.tab_items drop constraint tab_items_catalog_item_id_fkey;

alter table public.tab_items add constraint tab_items_catalog_item_id_fkey
  foreign key (catalog_item_id) references public.catalog_items(id) on delete cascade;
