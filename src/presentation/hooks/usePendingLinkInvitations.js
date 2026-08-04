import { useQuery } from '@tanstack/react-query';

import { container } from '../../di/container';

// Se consulta una vez resuelto el login (y el desbloqueo biométrico, si lo
// hay) — ver app/(app)/_layout.jsx, el único sitio que la usa. `enabled` lo
// pasa ese _layout: como los Hooks de React no se pueden llamar solo a
// veces, este hook siempre se monta, pero la petición real solo se dispara
// cuando ya hay sesión desbloqueada de verdad (si no, la RPC fallaría por
// no haber `auth.uid()` todavía). Gracias al índice único de la migración
// 0019 (a lo sumo una invitación pendiente por destinatario resuelto), esto
// será casi siempre un array de 0 o 1 elementos.
export function usePendingLinkInvitations(enabled) {
  return useQuery({
    queryKey: ['pendingLinkInvitations'],
    queryFn: () => container.accountLinkRepository.getMyPendingInvitations(),
    enabled,
  });
}
