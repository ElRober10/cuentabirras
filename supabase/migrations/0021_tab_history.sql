-- ============================================================
-- Histórico de cuentas (RPC de lectura)
-- ============================================================
-- listAllForCurrentUser (usada hoy para contar visitas por bar) devuelve
-- las filas de `tabs` en crudo, sin nombre de bar ni total — de sobra para
-- ese uso, pero no para una pantalla de histórico de verdad.
--
-- No basta con hacer ese join desde el cliente: si en algún momento sales
-- de un bar (bar_members), la política de `bars` ya no te deja leer su
-- fila — pero tu propio histórico de cuentas en ese bar debe seguir
-- viéndose igual, tú SEGUISTE yendo allí en su momento. Por eso hace falta
-- un RPC `security definer`: junta tabs (filtradas por tab_participants,
-- que sí sigues viendo siempre) con el nombre del bar (bars, se salta su
-- RLS aquí dentro) y con el total ya sumado desde tab_items, para no tener
-- que hacer una consulta aparte por cada cuenta del histórico.
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
  left join public.tab_items ti on ti.tab_id = t.id
  group by t.id, b.name
  order by t.created_at desc;
$$;

grant execute on function public.get_my_tab_history() to authenticated;
