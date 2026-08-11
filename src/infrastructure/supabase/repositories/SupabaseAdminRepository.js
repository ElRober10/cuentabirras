import { supabase } from '../client';

// Esta es la implementación REAL del contrato IAdminRepository
// (domain/repositories/IAdminRepository.js). El RPC ya comprueba por su
// cuenta que quien llama es admin (ver migración 0023) — aquí no se repite
// esa comprobación, solo se traduce la respuesta.
/** @type {import('../../../domain/repositories/IAdminRepository').IAdminRepository} */
export const supabaseAdminRepository = {
  async getDashboardStats() {
    const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
    if (error) throw error;
    const row = data[0];
    return {
      totalUsers: Number(row.total_users),
      totalBars: Number(row.total_bars),
      totalTabs: Number(row.total_tabs),
      totalDrinks: Number(row.total_drinks),
      newUsersLast7Days: Number(row.new_users_last_7_days),
      activeLinkedAccounts: Number(row.active_linked_accounts),
      topDrinkName: row.top_drink_name,
      topDrinkCount: Number(row.top_drink_count),
      customDrinksPendingIcon: Number(row.custom_drinks_pending_icon),
    };
  },
};
