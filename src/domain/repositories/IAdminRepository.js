// Contrato para el panel de administración (Fase 1, solo cifras generales).
// Implementación real: infrastructure/supabase/repositories/SupabaseAdminRepository.js
/**
 * @typedef {Object} AdminDashboardStats
 * @property {number} totalUsers
 * @property {number} totalBars
 * @property {number} totalTabs
 * @property {number} totalDrinks
 * @property {number} newUsersLast7Days - Registros en los últimos 7 días, para ver de un vistazo si la app está creciendo.
 * @property {number} activeLinkedAccounts - Cuántas parejas tienen la cuenta vinculada activa ahora mismo (ver migración 0019).
 * @property {string|null} topDrinkName - Nombre de la bebida más pedida de toda la app (null si todavía no se ha pedido ninguna).
 * @property {number} topDrinkCount - Cuántas unidades lleva pedidas esa bebida.
 * @property {number} customDrinksPendingIcon - Bebidas "Otro" creadas sin icono (catalog_items.icon is null) — ya se avisa por push al crearse (migración 0025), esto es solo el contador acumulado.
 *
 * @typedef {Object} IAdminRepository
 * @property {() => Promise<AdminDashboardStats>} getDashboardStats - Cifras generales de toda la app. Lanza si quien llama no es admin (lo comprueba el propio RPC, no confíes solo en que la pantalla no se enseñe).
 */

export {};
