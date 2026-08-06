-- Una cuenta sin ninguna bebida añadida no cuenta como una cuenta "de
-- verdad" para el histórico — mismo criterio que ya usa openOrResumeTab.js
-- al entrar a un bar: se crea una fila en `tabs` en cuanto entras, aunque
-- no llegues a pedir nada y te vayas, y esas cuentas vacías no deberían
-- ensuciar el histórico ni contar como "ya tienes una cuenta abierta aquí"
-- al intentar reabrir una antigua (ver application/tabs/reopenClosedTab.js).
--
-- Único cambio real sobre la 0021: el `left join` a tab_items pasa a ser un
-- `join` normal, así que una cuenta sin ninguna fila en tab_items
-- simplemente no aparece en el resultado.
create or replace function public.get_my_tab_history()
returns table (
  tab_id      uuid,
  bar_id      uuid,
  bar_name    text,
  status      text,
  created_at  timestamptz,
  closed_at   timestamptz,
  total_cents bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    t.id,
    t.bar_id,
    b.name,
    t.status,
    t.created_at,
    t.closed_at,
    coalesce(sum(coalesce(ti.price_cents_at_add, 0) * ti.quantity), 0)::bigint
  from public.tabs t
  join public.tab_participants tp on tp.tab_id = t.id and tp.user_id = auth.uid()
  join public.bars b on b.id = t.bar_id
  join public.tab_items ti on ti.tab_id = t.id
  group by t.id, b.name
  order by t.created_at desc;
$$;
