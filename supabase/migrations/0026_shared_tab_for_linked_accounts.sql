-- ============================================================
-- Cuenta compartida de verdad entre parejas vinculadas
-- ============================================================
-- Hasta ahora, "vincular cuenta" (migración 0019) solo creaba la relación y
-- el indicador "Vinculada con X" — cada uno seguía teniendo su PROPIA cuenta
-- (tab) privada en cada bar, sin compartir ni un solo tab_item. Confirmado
-- con el usuario 2026-08-07: lo que quiere de verdad es que, si los dos
-- estáis vinculados y entráis al MISMO bar, sea la MISMA cuenta — lo que
-- añada uno lo vea el otro, sin repartir nada entre los dos.
--
-- El esquema ya estaba preparado para esto desde el principio: tab_items se
-- filtra por PARTICIPANTE (tab_participants), no por creador, y ya admite
-- varias filas por tab_id (era la idea original de "Fase 3" de la migración
-- 0003, nunca completada). Solo faltaba una forma de UNIRSE a una cuenta
-- ajena — hasta ahora tab_participants no tenía policy de insert a
-- propósito (nadie se añade a sí mismo ni a otros directamente), así que
-- hace falta una función security definer, igual que join_bar en la 0018.
--
-- open_or_join_tab(bar) sustituye a "crear cuenta nueva sin más" en el
-- cliente (ver openOrResumeTab.js/startNewTab.js): antes de crear una,
-- comprueba si tu pareja vinculada ya tiene una abierta en ese mismo bar, y
-- si es así te unes a ELLA en vez de crear una aparte.
create or replace function public.open_or_join_tab(target_bar_id uuid)
returns public.tabs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id  uuid := auth.uid();
  v_partner_id uuid;
  v_tab        public.tabs%rowtype;
begin
  -- ¿Ya tengo yo una cuenta abierta en este bar? (normal si ya la creé o ya
  -- me uní a la de mi pareja en una visita anterior de hoy).
  select t.* into v_tab
  from public.tabs t
  join public.tab_participants tp on tp.tab_id = t.id and tp.user_id = v_caller_id
  where t.bar_id = target_bar_id and t.status = 'open'
  limit 1;

  if v_tab.id is not null then
    return v_tab;
  end if;

  -- ¿Tengo una cuenta vinculada activa? (migración 0019)
  select other.user_id into v_partner_id
  from public.account_link_members me
  join public.account_link_members other
    on other.link_id = me.link_id and other.user_id <> me.user_id and other.unlinked_at is null
  where me.user_id = v_caller_id and me.unlinked_at is null;

  if v_partner_id is not null then
    -- ¿Mi pareja ya tiene una cuenta abierta en este bar? Si sí, me uno.
    select t.* into v_tab
    from public.tabs t
    join public.tab_participants tp on tp.tab_id = t.id and tp.user_id = v_partner_id
    where t.bar_id = target_bar_id and t.status = 'open'
    limit 1;

    if v_tab.id is not null then
      insert into public.tab_participants (tab_id, user_id)
      values (v_tab.id, v_caller_id)
      on conflict do nothing;
      return v_tab;
    end if;
  end if;

  -- Ninguno de los dos tenía cuenta abierta aquí: creo una nueva (el
  -- trigger on_tab_created ya me añade como participante).
  insert into public.tabs (bar_id, created_by)
  values (target_bar_id, v_caller_id)
  returning * into v_tab;

  return v_tab;
end;
$$;

grant execute on function public.open_or_join_tab(uuid) to authenticated;
