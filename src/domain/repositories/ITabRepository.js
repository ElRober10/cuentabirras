// Contrato para abrir/consultar/cerrar cuentas (tabs).
// Implementación real: infrastructure/supabase/repositories/SupabaseTabRepository.js
/**
 * @typedef {Object} TabHistoryEntry
 * @property {string} tabId
 * @property {string} barId
 * @property {string} barName
 * @property {'open'|'closed'} status
 * @property {string} createdAt
 * @property {string|null} closedAt
 * @property {number} totalCents
 *
 * @typedef {Object} ITabRepository
 * @property {(barId: string) => Promise<Tab|null>} findOpenTabForBar - "¿Tengo ya una cuenta abierta en este bar?" (RLS ya filtra por ti, no hace falta pasar tu id) — la pregunta clave para decidir si entrar directo (no hay ninguna) o preguntar "continuar o nueva" (sí la hay).
 * @property {(barId: string) => Promise<Tab>} openOrJoinTab - Crea una cuenta nueva en ese bar — salvo que tengas una pareja vinculada (ver IAccountLinkRepository) que YA tenga una abierta ahí, en cuyo caso te unes a la suya en vez de crear otra (así lo que añada uno lo ve el otro). RPC `open_or_join_tab` (migración 0026), security definer porque unirte a una cuenta ajena requiere insertar en tab_participants, algo que el cliente no puede hacer directamente.
 * @property {(tabId: string) => Promise<void>} closeTab - Marca la cuenta como cerrada (status: 'closed'); a partir de ahí ya no se pueden añadir/editar bebidas.
 * @property {(tabId: string) => Promise<void>} reopenTab - Deshace un cierre: vuelve a dejar la cuenta como abierta. Se usa tanto para "Cancelar cierre" (ticket recién cerrado) como para reabrir una cuenta antigua desde el histórico (ver application/tabs/reopenClosedTab.js, que además comprueba que no haya ya otra abierta en ese bar).
 * @property {() => Promise<Tab[]>} listAllForCurrentUser - Todas tus cuentas, de cualquier bar y en cualquier estado (RLS ya filtra por ti). Se usa para calcular "a qué bares vas más" (número de visitas) al ordenar la lista de bares.
 * @property {() => Promise<TabHistoryEntry[]>} getMyTabHistory - Todas tus cuentas, con el nombre del bar y el total ya calculado, ordenadas de más reciente a más antigua — para la pantalla de histórico. A diferencia de listAllForCurrentUser, funciona igual aunque ya no seas miembro del bar (RPC security definer).
 */

export {};
