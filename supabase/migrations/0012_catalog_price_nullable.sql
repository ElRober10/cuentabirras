-- Hasta ahora, toda bebida del catálogo tenía que nacer con un precio
-- (columna "not null"). Ahora se puede dar de alta una bebida SIN precio
-- todavía — la app, al intentar añadirla a una cuenta, pedirá el precio en
-- ese momento y lo guardará aquí para las próximas veces.
alter table public.catalog_items alter column price_cents drop not null;

-- El check original ("price_cents >= 0") no contemplaba el caso "sin
-- precio" (null) — un check con null en la condición se considera "no
-- viola la regla" en Postgres, así que en realidad ya dejaría pasar null,
-- pero lo dejamos explícito para que se entienda leyendo el esquema.
alter table public.catalog_items drop constraint catalog_items_price_cents_check;
alter table public.catalog_items add constraint catalog_items_price_cents_check
  check (price_cents is null or price_cents >= 0);
