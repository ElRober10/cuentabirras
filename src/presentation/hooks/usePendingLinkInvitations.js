import { useQuery } from '@tanstack/react-query';

import { container } from '../../di/container';

// Se consulta una vez resuelto el login (y el desbloqueo biométrico, si lo
// hay) — ver app/(app)/_layout.jsx (el diálogo automático) y
// app/(app)/settings/link-account.jsx (la tarjeta de aceptar/rechazar en la
// propia pantalla). `enabled` lo pasa quien la usa: como los Hooks de React
// no se pueden llamar solo a veces, este hook siempre se monta, pero la
// petición real solo se dispara cuando ya hay sesión desbloqueada de verdad
// (si no, la RPC fallaría por no haber `auth.uid()` todavía). Gracias al
// índice único de la migración 0019 (a lo sumo una invitación pendiente por
// destinatario resuelto), esto será casi siempre un array de 0 o 1 elementos.
//
// `refetchInterval`: sin esto, una invitación que llegue mientras la app ya
// está abierta (sesión ya desbloqueada) no se vería nunca hasta reiniciar la
// app — no hay push garantizado (solo funciona con build EAS y token
// guardado) ni ningún mecanismo que vuelva a comprobar al volver a primer
// plano. Sondear cada minuto es barato (una sola RPC) y hace que el aviso
// llegue solo, sin depender del push.
export function usePendingLinkInvitations(enabled) {
  return useQuery({
    queryKey: ['pendingLinkInvitations'],
    queryFn: () => container.accountLinkRepository.getMyPendingInvitations(),
    enabled,
    refetchInterval: enabled ? 60 * 1000 : false,
  });
}
