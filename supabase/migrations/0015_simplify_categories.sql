-- Se simplifica la categoría a solo dos opciones: "bebida" (la principal,
-- usable ya) y "comida" (pensada para una versión futura, todavía no
-- implementada del todo en la app, pero se deja preparado el hueco).
-- Sustituye a la lista larga de las migraciones 0005/0006 (botellín, caña,
-- refresco, licor...) — esa variedad ahora la dan los 12 iconos concretos
-- (ver drinkIcons.js); la categoría solo decide el icono GENÉRICO de
-- respaldo para cuando no se elige ninguno de esos 12 ("Otro").
--
-- OJO con el orden: hay que quitar la restricción ANTES de tocar los
-- datos — si no, el propio UPDATE de aquí abajo (que pone "bebida", un
-- valor que la restricción vieja no permite) fallaría igual que le pasó a
-- la app.
alter table public.catalog_items drop constraint catalog_items_category_check;

update public.catalog_items set category = 'bebida' where category <> 'comida';

alter table public.catalog_items add constraint catalog_items_category_check
  check (category in ('bebida', 'comida'));

alter table public.catalog_items alter column category set default 'bebida';
