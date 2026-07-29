import { supabase } from '../client';

// Traduce una fila de la tabla `bars` (snake_case) a la forma Bar de
// domain/entities/Bar.js (camelCase). Mismo patrón que fetchProfile() en
// SupabaseAuthRepository.js.
function mapBar(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

// getSession() lee la sesión guardada localmente (rápido, sin red) — a
// diferencia de getUser(), que revalida contra el servidor de Supabase. Aquí
// nos vale con lo local: solo necesitamos el id del usuario actual.
async function getCurrentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session.user.id;
}

/** @type {import('../../../domain/repositories/IBarRepository').IBarRepository} */
export const supabaseBarRepository = {
  async createBar({ name, latitude, longitude }) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('bars')
      .insert({
        name,
        // ?? en vez de || : si latitude es 0 (un valor real y válido cerca
        // del ecuador/meridiano de Greenwich), || lo trataría como "falsy" y
        // lo cambiaría por null por error; ?? solo sustituye si es
        // null/undefined de verdad.
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw error;
    return mapBar(data);
  },

  async listVisibleBars() {
    // No hace falta filtrar por usuario aquí: RLS (migración 0003, ajustada
    // en la 0007 para excluir los bares que hayas ocultado) ya decide qué
    // filas puede ver esta petición.
    const { data, error } = await supabase.from('bars').select('*').order('name');
    if (error) throw error;
    return data.map(mapBar);
  },

  async removeBarForCurrentUser(barId) {
    // Esta es una función RPC (Remote Procedure Call): en vez de un simple
    // select/insert/update, ejecuta una función que vive en la propia base
    // de datos (ver migración 0007, remove_bar_for_current_user). Hace
    // falta porque decidir "borrar del todo o solo ocultar" requiere
    // comprobar si OTRAS personas usan el bar — algo que, por seguridad, tu
    // propio usuario no puede consultar directamente (RLS no te deja ver
    // las cuentas de otros). La función se ejecuta con permisos elevados
    // dentro de la base de datos, de forma controlada, y solo devuelve el
    // resultado ('deleted' o 'hidden'), nunca los datos ajenos.
    const { data, error } = await supabase.rpc('remove_bar_for_current_user', { target_bar_id: barId });
    if (error) throw error;
    return data; // 'deleted' | 'hidden'
  },
};
