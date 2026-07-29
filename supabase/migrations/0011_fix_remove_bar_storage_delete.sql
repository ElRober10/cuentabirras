-- La migración 0010 intentó borrar los archivos de foto directamente con
-- "delete from storage.objects" dentro de la función, pero Supabase lo
-- bloquea a propósito ("Direct deletion from storage tables is not
-- allowed. Use the Storage API instead") — por eso borrar un bar dejó de
-- funcionar del todo. La única forma correcta de borrar un archivo de
-- Storage es a través de su API (HTTP), no con SQL directo, así que ese
-- borrado se hace ahora desde la app (ver BarListItem/index.jsx), justo
-- antes de llamar a esta función. Aquí solo se deja la función como estaba
-- en la migración 0007 (decidir borrar del todo u ocultar).
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
