import { supabase } from '../client';

function mapTabItem(row) {
  return {
    id: row.id,
    tabId: row.tab_id,
    catalogItemId: row.catalog_item_id,
    addedBy: row.added_by,
    priceCentsAtAdd: row.price_cents_at_add,
    quantity: row.quantity,
    createdAt: row.created_at,
  };
}

async function getCurrentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session.user.id;
}

/** @type {import('../../../domain/repositories/ITabItemRepository').ITabItemRepository} */
export const supabaseTabItemRepository = {
  async listByTab(tabId) {
    const { data, error } = await supabase
      .from('tab_items')
      .select('*')
      .eq('tab_id', tabId)
      .order('created_at');
    if (error) throw error;
    return data.map(mapTabItem);
  },

  async addItem({ tabId, catalogItemId, priceCentsAtAdd, quantity = 1 }) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('tab_items')
      .insert({
        tab_id: tabId,
        catalog_item_id: catalogItemId,
        added_by: userId,
        price_cents_at_add: priceCentsAtAdd,
        quantity,
      })
      .select()
      .single();
    if (error) throw error;
    return mapTabItem(data);
  },

  // Quita UNA unidad de esa bebida (para corregir un error al añadir) —
  // siempre la del "montón" que TÚ añadiste más recientemente: si esa fila
  // tenía más de una unidad, solo baja el número; si tenía una sola, borra
  // la fila entera. Solo se pueden tocar las filas que añadiste tú mismo
  // (política de RLS "tab_items_update_own"/"tab_items_delete_own").
  async removeOneUnit({ tabId, catalogItemId }) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('tab_items')
      .select('id, quantity')
      .eq('tab_id', tabId)
      .eq('catalog_item_id', catalogItemId)
      .eq('added_by', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return;

    if (data.quantity > 1) {
      const { error: updateError } = await supabase
        .from('tab_items')
        .update({ quantity: data.quantity - 1 })
        .eq('id', data.id);
      if (updateError) throw updateError;
    } else {
      const { error: deleteError } = await supabase.from('tab_items').delete().eq('id', data.id);
      if (deleteError) throw deleteError;
    }
  },
};
