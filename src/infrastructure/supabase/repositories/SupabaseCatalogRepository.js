import { supabase } from '../client';

function mapCatalogItem(row) {
  return {
    id: row.id,
    barId: row.bar_id,
    name: row.name,
    category: row.category,
    color: row.color,
    icon: row.icon,
    priceCents: row.price_cents,
    currency: row.currency,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

async function getCurrentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session.user.id;
}

/** @type {import('../../../domain/repositories/ICatalogRepository').ICatalogRepository} */
export const supabaseCatalogRepository = {
  async listByBar(barId) {
    const { data, error } = await supabase
      .from('catalog_items')
      .select('*')
      .eq('bar_id', barId)
      .order('name');
    if (error) throw error;
    return data.map(mapCatalogItem);
  },

  async createItem({ barId, name, category, color, icon, priceCents }) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('catalog_items')
      .insert({
        bar_id: barId,
        name,
        category,
        color,
        icon: icon ?? null,
        price_cents: priceCents ?? null,
        updated_by: userId,
      })
      .select()
      .single();
    if (error) throw error;
    return mapCatalogItem(data);
  },

  async updatePrice({ catalogItemId, priceCents }) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('catalog_items')
      .update({ price_cents: priceCents, updated_by: userId })
      .eq('id', catalogItemId)
      .select()
      .single();
    if (error) throw error;
    return mapCatalogItem(data);
  },

  async getPopularity(barId) {
    const { data, error } = await supabase.rpc('get_catalog_item_popularity', { target_bar_id: barId });
    if (error) throw error;
    return data;
  },

  async getIconPopularity() {
    const { data, error } = await supabase.rpc('get_icon_popularity');
    if (error) throw error;
    return data;
  },
};
