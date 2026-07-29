-- Además de la categoría (que decide el icono GENÉRICO de respaldo), ahora
-- cada bebida puede tener asignada una de las 12 ilustraciones concretas
-- (ver src/shared/constants/drinkIcons.js). Es opcional: si es null, se
-- sigue usando el icono genérico de la categoría, como hasta ahora — así
-- las bebidas ya creadas no se rompen.
alter table public.catalog_items add column icon text null;
