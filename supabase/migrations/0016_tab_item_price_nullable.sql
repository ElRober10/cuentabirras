-- Se puede añadir una bebida a la cuenta SIN saber su precio (botón "No sé
-- el precio" en el diálogo) — antes price_cents_at_add era obligatorio, así
-- que no había forma de guardar esa fila. La app avisa en el total cuando
-- hay alguna bebida sin precio (el total real puede no ser exacto).
alter table public.tab_items alter column price_cents_at_add drop not null;
