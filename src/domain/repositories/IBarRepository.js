// Mismo concepto que IAuthRepository.js: un contrato, no código real. La
// implementación de verdad está en infrastructure/supabase/repositories/SupabaseBarRepository.js
/**
 * @typedef {Object} IBarRepository
 * @property {(params: {name: string, latitude?: number, longitude?: number}) => Promise<Bar>} createBar - `latitude`/`longitude` con "?" son opcionales: si no se pasan, el bar sale sin coordenadas (nadie más podrá encontrarlo con findNearbyBars). Al crearse te unes automáticamente (trigger `on_bar_created`, migración 0018) — no hace falta llamar a joinBar aparte.
 * @property {() => Promise<Bar[]>} listVisibleBars - Devuelve los bares de los que eres miembro (bar_members) — RLS ya filtra el resto, aquí no hace falta preguntar por quién eres. El ORDEN por distancia NO se hace aquí: se calcula después, en application/bars/listBarsSortedByDistance.js.
 * @property {(params: {latitude: number, longitude: number, radiusMeters?: number}) => Promise<{id: string, name: string, distanceMeters: number}[]>} findNearbyBars - Busca bares (de CUALQUIER usuario, no solo los tuyos) cerca de un punto, para el aviso de "¿ya existe este bar?" al crear uno — por eso no puede salir de listVisibleBars, necesita ver bares de los que aún no eres miembro. Solo trae id/nombre/distancia, nunca coordenadas ni quién lo creó.
 * @property {(barId: string) => Promise<void>} joinBar - Te une a un bar que ya existe (cuando eliges "es este" en el aviso de bar cercano), sin crear uno nuevo. A partir de ahí lo ves en tu lista y compartes su catálogo, igual que si lo hubieras creado tú.
 * @property {(barId: string) => Promise<'deleted'|'hidden'>} removeBarForCurrentUser - Quita el bar de tu lista (borra tu propia fila de bar_members): si nadie más es miembro, el bar se borra de verdad; si lo usan otras personas, solo dejas de ser miembro tú. La decisión la toma el servidor (nunca el cliente), porque requiere comprobar el uso de otras personas sin que tú puedas verlo directamente.
 */

export {};
