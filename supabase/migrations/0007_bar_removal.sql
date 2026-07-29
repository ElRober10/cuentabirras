-- ============================================================
-- 1) Arreglo previo: al borrar un bar, sus cuentas (tabs) deben borrarse
-- también en cascada. La migración 0003 no lo dejó así (se le olvidó poner
-- "on delete cascade" en esta relación en concreto), así que sin este
-- arreglo, borrar un bar con cuentas fallaría.
-- ============================================================
alter table public.tabs drop constraint tabs_bar_id_fkey;

alter table public.tabs add constraint tabs_bar_id_fkey
  foreign key (bar_id) references public.bars(id) on delete cascade;

-- ============================================================
-- 2) Bares ocultados: cuando un bar lo usan varias personas y tú quieres
-- "quitarlo de tu lista", no se puede borrar de verdad (le pertenece
-- también a los demás) — se oculta SOLO para ti. Es privado por diseño: es
-- tu preferencia personal, nadie más debe verla ni verse afectado por ella.
-- ============================================================
create table public.hidden_bars (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  bar_id     uuid not null references public.bars(id) on delete cascade,
  hidden_at  timestamptz not null default now(),
  primary key (user_id, bar_id)
);

alter table public.hidden_bars enable row level security;

create policy "hidden_bars_own"
  on public.hidden_bars for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, delete on public.hidden_bars to authenticated;

-- Actualizamos la política de lectura de `bars` (de la migración 0003) para
-- que, además de "público o tuyo privado", excluya los que hayas ocultado.
drop policy "bars_select_public_or_own" on public.bars;

create policy "bars_select_public_or_own"
  on public.bars for select
  using (
    (latitude is not null or created_by = auth.uid())
    and not exists (
      select 1 from public.hidden_bars h
      where h.bar_id = bars.id and h.user_id = auth.uid()
    )
  );

-- ============================================================
-- 3) La función que decide "borrar u ocultar", ejecutada en el servidor.
-- Necesita "security definer" (permisos elevados) porque, para decidir,
-- tiene que comprobar si EXISTEN cuentas de OTRAS personas en este bar —
-- algo que, con las políticas normales, tu usuario no podría consultar
-- (por diseño: no puedes ver las cuentas ajenas). La función solo te
-- devuelve el resultado de la decisión ('deleted' o 'hidden'), nunca los
-- datos de esas otras personas.
-- ============================================================
create or replace function public.remove_bar_for_current_user(target_bar_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  used_by_others boolean;
begin
  select exists (
    select 1 from public.tabs
    where bar_id = target_bar_id and created_by <> auth.uid()
  ) into used_by_others;

  if used_by_others then
    insert into public.hidden_bars (user_id, bar_id)
    values (auth.uid(), target_bar_id)
    on conflict (user_id, bar_id) do nothing;
    return 'hidden';
  else
    delete from public.bars where id = target_bar_id;
    return 'deleted';
  end if;
end;
$$;

grant execute on function public.remove_bar_for_current_user(uuid) to authenticated;
