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

    // OJO con este patrón: NO encadenamos .select() al insert (mismo caso
    // que createTab en SupabaseTabRepository.js). Si lo hiciéramos, Postgres
    // comprobaría la política de LECTURA de `bars` (que desde la migración
    // 0018 exige ya ser miembro) en el mismo instante en que se inserta la
    // fila — justo antes de que el trigger on_bar_created (que te añade
    // como miembro) haya terminado de asentarse. Eso es lo que causaba el
    // error "new row violates row-level security policy". Separando el
    // insert de la lectura en dos pasos, la segunda consulta ya ve el
    // resultado del trigger sin problema.
    const { error: insertError } = await supabase.from('bars').insert({
      name,
      // ?? en vez de || : si latitude es 0 (un valor real y válido cerca
      // del ecuador/meridiano de Greenwich), || lo trataría como "falsy" y
      // lo cambiaría por null por error; ?? solo sustituye si es
      // null/undefined de verdad.
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      created_by: userId,
    });
    if (insertError) throw insertError;

    const { data, error } = await supabase
      .from('bars')
      .select('*')
      .eq('created_by', userId)
      .eq('name', name)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (error) throw error;
    return mapBar(data);
  },

  async listVisibleBars() {
    // No hace falta filtrar por usuario aquí: RLS (migración 0018) ya solo
    // deja ver las filas de `bars` de las que eres miembro (bar_members).
    const { data, error } = await supabase.from('bars').select('*').order('name');
    if (error) throw error;
    return data.map(mapBar);
  },

  async findNearbyBars({ latitude, longitude, radiusMeters = 500 }) {
    // RPC en vez de un select normal: tiene que poder devolver bares de los
    // que TODAVÍA no eres miembro (si no, nunca detectaría un bar ajeno
    // como posible duplicado), así que corre con permisos elevados dentro
    // de la base de datos (ver migración 0018, find_nearby_bars) y solo
    // trae lo justo para el aviso — id, nombre y distancia.
    const { data, error } = await supabase.rpc('find_nearby_bars', {
      search_lat: latitude,
      search_lng: longitude,
      radius_meters: radiusMeters,
    });
    if (error) throw error;
    return data.map((row) => ({ id: row.id, name: row.name, distanceMeters: row.distance_meters }));
  },

  async joinBar(barId) {
    const { error } = await supabase.rpc('join_bar', { target_bar_id: barId });
    if (error) throw error;
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
