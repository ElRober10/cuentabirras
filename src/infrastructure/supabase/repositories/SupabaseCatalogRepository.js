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

    // Ponerle precio a una bebida que no lo tenía no debe dejar "colgadas"
    // las cuentas abiertas donde ya se añadió sin precio (price_cents_at_add
    // null) — si no, se quedan sin sumar hasta quitarla y volver a meterla.
    // La política "tab_items_update_participant" (migración 0031) ya limita
    // esto solo a tus propias cuentas abiertas, así que no hace falta
    // filtrar aquí por tab ni por participante.
    if (priceCents != null) {
      const { error: backfillError } = await supabase
        .from('tab_items')
        .update({ price_cents_at_add: priceCents })
        .eq('catalog_item_id', catalogItemId)
        .is('price_cents_at_add', null);
      if (backfillError) throw backfillError;
    }

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
