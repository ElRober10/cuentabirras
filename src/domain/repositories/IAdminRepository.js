// Contrato para el panel de administración (Fase 1, solo cifras generales).
// Implementación real: infrastructure/supabase/repositories/SupabaseAdminRepository.js
/**
 * @typedef {Object} AdminDashboardStats
 * @property {number} totalUsers
 * @property {number} totalBars
 * @property {number} totalTabs
 * @property {number} totalDrinks
 *
 * @typedef {Object} IAdminRepository
 * @property {() => Promise<AdminDashboardStats>} getDashboardStats - Cifras generales de toda la app. Lanza si quien llama no es admin (lo comprueba el propio RPC, no confíes solo en que la pantalla no se enseñe).
 */

export {};
