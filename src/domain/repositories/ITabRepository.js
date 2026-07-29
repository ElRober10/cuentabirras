// Contrato para abrir/consultar/cerrar cuentas (tabs).
// Implementación real: infrastructure/supabase/repositories/SupabaseTabRepository.js
/**
 * @typedef {Object} ITabRepository
 * @property {(barId: string) => Promise<Tab|null>} findOpenTabForBar - "¿Tengo ya una cuenta abierta en este bar?" (RLS ya filtra por ti, no hace falta pasar tu id) — la pregunta clave para decidir si entrar directo (no hay ninguna) o preguntar "continuar o nueva" (sí la hay).
 * @property {(barId: string) => Promise<Tab>} createTab - Crea una cuenta nueva; el trigger de la base de datos (migración 0003) te añade automáticamente como participante, no hace falta hacerlo a mano desde aquí.
 * @property {(tabId: string) => Promise<void>} closeTab - Marca la cuenta como cerrada (status: 'closed'); a partir de ahí ya no se pueden añadir/editar bebidas.
 * @property {(tabId: string) => Promise<void>} reopenTab - Deshace un cierre reciente: vuelve a dejar la cuenta como abierta ("Cancelar cierre" en la pantalla del ticket).
 * @property {() => Promise<Tab[]>} listAllForCurrentUser - Todas tus cuentas, de cualquier bar y en cualquier estado (RLS ya filtra por ti). Se usa para calcular "a qué bares vas más" (número de visitas) al ordenar la lista de bares.
 */

export {};
