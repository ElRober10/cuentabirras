-- La migración 0005 guardó "cana" (sin ñ) como valor interno de la
-- categoría "Caña / jarra". Aunque ese valor nunca se muestra tal cual en la
-- app (solo se usa como clave técnica para elegir el icono), se ve mal si
-- miras la tabla directamente en Supabase — lo corregimos a "caña".

-- Por si ya había alguna fila creada con el valor antiguo.
update public.catalog_items set category = 'caña' where category = 'cana';

-- Hay que quitar la restricción CHECK anterior y ponerla de nuevo con el
-- valor corregido (no se puede "editar" un CHECK ya existente, solo
-- sustituirlo). "catalog_items_category_check" es el nombre que Postgres le
-- puso automáticamente en la migración 0005.
alter table public.catalog_items drop constraint catalog_items_category_check;

alter table public.catalog_items add constraint catalog_items_category_check
  check (category in (
    'botellin', 'caña', 'refresco', 'licor', 'cubata',
    'cafe', 'colacao', 'desayuno', 'zumo', 'batido', 'otro'
  ));
