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
 * @typedef {Object} PendingIconRequest
 * @property {string} name - Nombre tal cual lo escribió quien creó la bebida (coincidencia exacta, sin normalizar mayúsculas/acentos).
 * @property {number} pendingCount - Cuántas filas de catalog_items (en todos los bares) tienen ese nombre y siguen sin icono.
 *
 * @typedef {Object} BarLocationCount
 * @property {boolean} hasLocation - false si el bar se creó sin permiso de ubicación (queda privado, sin coordenadas) — en ese caso country/region/province/city son null.
 * @property {string|null} country
 * @property {string|null} region - Comunidad autónoma (o el equivalente que devuelva la geocodificación fuera de España); null si la geocodificación aún no ha terminado o no encontró nada.
 * @property {string|null} province
 * @property {string|null} city
 * @property {number} barCount - Bares que caen exactamente en esa combinación de país/región/provincia/ciudad.
 *
 * @typedef {Object} DrinkRankingEntry
 * @property {string} name - Nombre de la bebida (agrupado por nombre en TODA la app, no por bar).
 * @property {number} totalCount - Unidades pedidas en total. Nunca 0 (las bebidas sin ningún pedido no aparecen).
 *
 * @typedef {Object} AuthEmailFailure
 * @property {'signup'|'password_reset'|'email_change'} flow - Flujo desde el que se detectó que no se pudo enviar el email de auth.
 * @property {string|null} email - Email al que se intentaba enviar (puede ser null en recuperar contraseña).
 * @property {string} createdAt - ISO timestamp de cuándo se registró la incidencia.
 *
 * @typedef {Object} IAdminRepository
 * @property {() => Promise<AdminDashboardStats>} getDashboardStats - Cifras generales de toda la app. Lanza si quien llama no es admin (lo comprueba el propio RPC, no confíes solo en que la pantalla no se enseñe).
 * @property {() => Promise<PendingIconRequest[]>} getPendingIconRequests - Bebidas "Otro" sin icono, agrupadas por nombre y ordenadas por cuántas hay pendientes (la más pedida primero).
 * @property {(params: {name: string, icon: string}) => Promise<number>} applyIconToPendingDrinks - Asigna `icon` a todas las catalog_items pendientes con ese `name` exacto (en todos los bares). Devuelve cuántas filas se actualizaron.
 * @property {() => Promise<BarLocationCount[]>} getBarsByLocation - Desglose de bares por ubicación, ya agregado en el RPC (una fila por cada combinación distinta de país/región/provincia/ciudad, con su recuento) — la pantalla decide qué nivel enseñar y va sumando barCount según haga falta.
 * @property {() => Promise<DrinkRankingEntry[]>} getDrinkRanking - Ranking completo de bebidas más pedidas de toda la app, ya ordenado de más a menos pedida.
 * @property {() => Promise<AuthEmailFailure[]>} getAuthEmailFailures - Incidencias de "no se pudo enviar el email de auth" de los últimos 30 días, la más reciente primero (ver migración 0040). Lanza si quien llama no es admin.
 */

export {};
