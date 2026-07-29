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

async function getCurrentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session.user.id;
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

  async createTab(barId) {
    const userId = await getCurrentUserId();

    // OJO con este patrón: NO encadenamos .select() al insert. Si lo
    // hiciéramos, Postgres tendría que comprobar la política de LECTURA de
    // `tabs` (que exige ya ser participante) en el mismo instante en que se
    // inserta la fila — justo antes de que el trigger que te añade como
    // participante haya terminado de asentarse. Eso es lo que causaba el
    // error "new row violates row-level security policy". Separando el
    // insert de la lectura en dos pasos, la segunda consulta ya ve el
    // resultado del trigger sin problema.
    const { error: insertError } = await supabase.from('tabs').insert({ bar_id: barId, created_by: userId });
    if (insertError) throw insertError;

    const { data, error } = await supabase
      .from('tabs')
      .select('*')
      .eq('bar_id', barId)
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
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
};
