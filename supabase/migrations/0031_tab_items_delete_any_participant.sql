-- ============================================================
-- Quitar bebidas: cualquier participante, no solo quien la añadió
-- ============================================================
-- Hasta ahora solo podías editar/borrar las filas de tab_items que TÚ
-- añadiste (tab_items_update_own/tab_items_delete_own, migración 0003) —
-- tenía sentido cuando cada cuenta tenía un único participante, pero desde
-- que las cuentas se comparten entre parejas vinculadas (migración 0026),
-- esto se traduce en un bug real: si tu pareja añadió una bebida, a ti el
-- botón de quitarla no te hace NADA (ni siquiera da error, simplemente no
-- encuentra ninguna fila tuya que tocar). Reportado 2026-08-07 probando en
-- real con dos cuentas vinculadas.
--
-- El arreglo: cualquier PARTICIPANTE de la cuenta (no solo quien la
-- añadió) puede editar/borrar cualquier tab_item — mismo criterio que ya
-- usan tab_items_select_participant/tab_items_insert_participant, así que
-- las 4 políticas de tab_items quedan consistentes entre sí.
drop policy "tab_items_update_own" on public.tab_items;
drop policy "tab_items_delete_own" on public.tab_items;

create policy "tab_items_update_participant"
  on public.tab_items for update
  using (
    exists (
      select 1 from public.tab_participants tp
      where tp.tab_id = tab_items.tab_id and tp.user_id = auth.uid()
    )
    and exists (select 1 from public.tabs t where t.id = tab_items.tab_id and t.status = 'open')
  );

create policy "tab_items_delete_participant"
  on public.tab_items for delete
  using (
    exists (
      select 1 from public.tab_participants tp
      where tp.tab_id = tab_items.tab_id and tp.user_id = auth.uid()
    )
    and exists (select 1 from public.tabs t where t.id = tab_items.tab_id and t.status = 'open')
  );
