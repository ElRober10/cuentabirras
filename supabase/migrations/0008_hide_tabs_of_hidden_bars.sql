-- Cuando ocultas un bar (porque lo usa más gente y no se puede borrar del
-- todo), tus propias cuentas (tabs) de ESE bar también deben dejar de
-- vérsete a ti — aunque el bar y esas cuentas sigan existiendo en la base
-- de datos para las demás personas que sí lo usan.
--
-- Se resuelve igual que hicimos con la tabla `bars` en la migración 0007:
-- ampliamos la política de LECTURA de `tabs` para que, además de exigir que
-- seas participante, compruebe que el bar de esa cuenta no esté en tu lista
-- de `hidden_bars`. Al estar a nivel de base de datos, se aplica sola en
-- CUALQUIER sitio de la app que consulte tabs (la pantalla de entrada al
-- bar, el cálculo de "a qué bares vas más"...), sin tener que acordarnos de
-- filtrar a mano en cada sitio.
drop policy "tabs_select_participant" on public.tabs;

create policy "tabs_select_participant"
  on public.tabs for select
  using (
    exists (
      select 1 from public.tab_participants tp
      where tp.tab_id = tabs.id and tp.user_id = auth.uid()
    )
    and not exists (
      select 1 from public.hidden_bars h
      where h.bar_id = tabs.bar_id and h.user_id = auth.uid()
    )
  );
