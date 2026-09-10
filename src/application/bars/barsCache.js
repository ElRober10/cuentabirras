// Helpers para tocar "a mano" la caché de react-query de la clave ['bars']
// (la lista de la pantalla de inicio) sin volver a pedirla al servidor.
//
// Existen porque esa caché NO guarda un array pelado: guarda el objeto
// { bars, hiddenCount, radiusKm } que devuelve listBarsSortedByDistance.
// Varias pantallas hacen actualizaciones optimistas sobre ella (al crear un
// bar, al quitarlo...) y cada una tenía su propia versión del "mete/quita de
// la lista" — cuando la forma del objeto cambió, esas copias sueltas se
// quedaron esparciendo/filtrando sobre un objeto y reventaban en runtime
// ("iterator method is not callable", "undefined is not a function").
// Centralizándolo aquí, el día que la forma vuelva a cambiar solo hay un
// sitio que tocar, y hay tests que lo fijan.

// Forma "vacía pero válida" de la caché, para cuando todavía no se ha
// resuelto ninguna consulta (setQueryData puede ejecutarse antes).
const EMPTY_BARS_CACHE = { bars: [], hiddenCount: 0, radiusKm: undefined };

/**
 * Devuelve la caché con `bar` como primer elemento de la lista, conservando
 * el resto de campos del objeto ({ hiddenCount, radiusKm }).
 */
export function prependBarToCache(cache, bar) {
  const base = cache ?? EMPTY_BARS_CACHE;
  return { ...base, bars: [bar, ...(base.bars ?? [])] };
}

/**
 * Devuelve la caché sin el bar de id `barId`. Si aún no hay caché, la deja
 * como está (undefined) — no hay nada que filtrar.
 */
export function removeBarFromCache(cache, barId) {
  if (!cache) return cache;
  return { ...cache, bars: (cache.bars ?? []).filter((bar) => bar.id !== barId) };
}
