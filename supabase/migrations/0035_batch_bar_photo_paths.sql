-- ============================================================
-- Fotos de bar: resolver varias de golpe (para la lista de bares)
-- ============================================================
-- Antes, cada BarListItem pedía SU foto por separado: una consulta a
-- bar_photos, otra (si hacía falta) a bar_official_photos, y luego una
-- llamada a Storage para firmar la URL — repetido por cada bar de la
-- lista, todo en cadena. Con esta función se resuelve en una sola consulta
-- qué photo_path le toca a cada bar (la tuya si la tienes, si no la
-- oficial), para TODOS los bares pedidos a la vez; el repositorio hace
-- luego UNA sola llamada a createSignedUrls con todos los paths juntos.
--
-- Sin "security definer" a propósito: al ejecutarse con los permisos de
-- quien llama, las RLS de bar_photos ("solo tu propia fila") y
-- bar_official_photos ("solo si eres miembro del bar") se siguen aplicando
-- exactamente igual que cuando el cliente consultaba estas tablas
-- directamente — este RPC no abre nada que antes no se pudiera ver.
create function public.get_bar_photo_paths(p_bar_ids uuid[])
returns table (
  bar_id      uuid,
  photo_path  text
)
language sql
stable
as $$
  select
    ids.bar_id,
    coalesce(bp.photo_path, bop.photo_path) as photo_path
  from unnest(p_bar_ids) as ids(bar_id)
  left join public.bar_photos bp on bp.bar_id = ids.bar_id
  left join public.bar_official_photos bop on bop.bar_id = ids.bar_id
  where coalesce(bp.photo_path, bop.photo_path) is not null;
$$;

grant execute on function public.get_bar_photo_paths(uuid[]) to authenticated;
