// Mismo concepto que IAuthRepository.js: un contrato, no código real. La
// implementación de verdad está en infrastructure/supabase/repositories/SupabaseBarRepository.js
/**
 * @typedef {Object} IBarRepository
 * @property {(params: {name: string, latitude?: number, longitude?: number}) => Promise<Bar>} createBar - `latitude`/`longitude` con "?" son opcionales: si no se pasan, el bar sale privado (ver Bar.js).
 * @property {() => Promise<Bar[]>} listVisibleBars - Devuelve los bares que puedes ver (públicos + los tuyos privados, y sin los que hayas ocultado); RLS ya filtra el resto en la base de datos, aquí no hace falta preguntar por quién eres. El ORDEN por distancia NO se hace aquí (es una regla de negocio, no de "cómo leer datos"): se calcula después, en application/bars/listBarsSortedByDistance.js.
 * @property {(barId: string) => Promise<'deleted'|'hidden'>} removeBarForCurrentUser - Quita el bar de tu lista: si nadie más lo usa, lo borra de verdad; si lo usan otras personas, solo lo oculta para ti. La decisión la toma el servidor (nunca el cliente), porque requiere comprobar el uso de otras personas sin que tú puedas verlo directamente.
 */

export {};
