import { supabase } from '../client';

function mapTab(row) {
  return {
    id: row.id,
    barId: row.bar_id,
    status: row.status,
    splitMode: row.split_mode,
    createdBy: row.created_by,
    createdAt: row.created_at,
    closedAt: row.closed_at,
  };
}

/** @type {import('../../../domain/repositories/ITabRepository').ITabRepository} */
export const supabaseTabRepository = {
  async findOpenTabForBar(barId) {
    // maybeSingle(): como single(), pero en vez de dar error si no hay
    // ninguna fila, devuelve null (aquí es normal no tener cuenta abierta).
    const { data, error } = await supabase
      .from('tabs')
      .select('*')
      .eq('bar_id', barId)
      .eq('status', 'open')
      .maybeSingle();
    if (error) throw error;
    return data ? mapTab(data) : null;
  },

  async openOrJoinTab(barId) {
    const { data, error } = await supabase.rpc('open_or_join_tab', { target_bar_id: barId });
    if (error) throw error;
    return mapTab(data);
  },

  async closeTab(tabId) {
    const { error } = await supabase
      .from('tabs')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', tabId);
    if (error) throw error;
  },

  // Deshacer un cierre reciente ("Cancelar cierre" en el ticket) — vuelve a
  // dejar la cuenta como abierta, tal cual estaba.
  async reopenTab(tabId) {
    const { error } = await supabase.from('tabs').update({ status: 'open', closed_at: null }).eq('id', tabId);
    if (error) throw error;
  },

  async listAllForCurrentUser() {
    // No hace falta filtrar por usuario a mano: RLS ya solo te deja ver las
    // cuentas donde participas (migración 0003).
    const { data, error } = await supabase.from('tabs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapTab);
  },

  async getMyTabHistory() {
    const { data, error } = await supabase.rpc('get_my_tab_history');
    if (error) throw error;
    return data.map((row) => ({
      tabId: row.tab_id,
      barId: row.bar_id,
      barName: row.bar_name,
      status: row.status,
      createdAt: row.created_at,
      closedAt: row.closed_at,
      totalCents: row.total_cents,
    }));
  },
};
