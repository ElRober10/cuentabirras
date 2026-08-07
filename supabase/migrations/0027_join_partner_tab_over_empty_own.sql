-- ============================================================
-- open_or_join_tab: unirse a la de la pareja incluso si YA tenías una
-- ============================================================
-- Bug encontrado probando en real (2026-08-07): la migración 0026 solo se
-- unía a la cuenta de la pareja vinculada cuando el propio usuario NO tenía
-- ninguna cuenta abierta en el bar — pero el cliente (openOrResumeTab.js)
-- comprueba PRIMERO si tú ya tienes una abierta (aunque esté vacía, de una
-- entrada anterior al bar) y, si la hay, entra directo en ella sin llegar a
-- llamar a esta función nunca. Resultado real: Roberto y Miriam se
-- vincularon, entraron los dos al mismo bar, pero cada uno se quedó en su
-- propia cuenta (una vacía, la otra con lo que añadió Miriam) sin compartir
-- nada.
--
-- Se mueve TODA la decisión aquí dentro (antes estaba repartida entre el
-- cliente y esta función): si mi propia cuenta abierta en este bar está
-- vacía (0 tab_items — mismo criterio que ya usa reopenClosedTab.js en el
-- cliente para "esto no cuenta como abierta de verdad") y mi pareja
-- vinculada tiene una abierta aquí con algo dentro, la cierro y me uno a la
-- suya. Si mi cuenta ya tiene contenido de verdad, se respeta tal cual (el
-- cliente pregunta "continuar o nueva", sin cambios ahí).
create or replace function public.open_or_join_tab(target_bar_id uuid)
returns public.tabs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id      uuid := auth.uid();
  v_partner_id     uuid;
  v_my_tab         public.tabs%rowtype;
  v_my_tab_has_items boolean := false;
  v_partner_tab    public.tabs%rowtype;
begin
  select t.* into v_my_tab
  from public.tabs t
  join public.tab_participants tp on tp.tab_id = t.id and tp.user_id = v_caller_id
  where t.bar_id = target_bar_id and t.status = 'open'
  limit 1;

  if v_my_tab.id is not null then
    select exists (select 1 from public.tab_items where tab_id = v_my_tab.id) into v_my_tab_has_items;

    -- Mi cuenta abierta aquí ya tiene algo de verdad: me quedo con la mía
    -- (el cliente decide si pregunta "continuar o nueva", sin tocar eso).
    if v_my_tab_has_items then
      return v_my_tab;
    end if;
  end if;

  -- No tengo cuenta abierta de verdad aquí (ninguna, o una vacía) — miro si
  -- mi pareja vinculada ya tiene una abierta en este mismo bar.
  select other.user_id into v_partner_id
  from public.account_link_members me
  join public.account_link_members other
    on other.link_id = me.link_id and other.user_id <> me.user_id and other.unlinked_at is null
  where me.user_id = v_caller_id and me.unlinked_at is null;

  if v_partner_id is not null then
    select t.* into v_partner_tab
    from public.tabs t
    join public.tab_participants tp on tp.tab_id = t.id and tp.user_id = v_partner_id
    where t.bar_id = target_bar_id and t.status = 'open'
    limit 1;

    if v_partner_tab.id is not null then
      -- Tenía una mía vacía y es una cuenta DISTINTA a la suya: la cierro
      -- (no cuenta como "de verdad", igual que reopenClosedTab.js) para no
      -- dejar dos cuentas abiertas a la vez en el mismo bar.
      if v_my_tab.id is not null and v_my_tab.id <> v_partner_tab.id then
        update public.tabs set status = 'closed', closed_at = now() where id = v_my_tab.id;
      end if;

      insert into public.tab_participants (tab_id, user_id)
      values (v_partner_tab.id, v_caller_id)
      on conflict do nothing;

      return v_partner_tab;
    end if;
  end if;

  -- Mi pareja (si la tengo) no tiene ninguna cuenta abierta aquí: reutilizo
  -- la vacía que ya tenía yo, si la tenía, en vez de crear otra de la nada.
  if v_my_tab.id is not null then
    return v_my_tab;
  end if;

  insert into public.tabs (bar_id, created_by)
  values (target_bar_id, v_caller_id)
  returning * into v_my_tab;

  return v_my_tab;
end;
$$;

grant execute on function public.open_or_join_tab(uuid) to authenticated;
