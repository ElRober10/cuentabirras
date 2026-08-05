// Contrato para elegir UN contacto de la agenda del móvil (usado al invitar
// por teléfono a vincular cuenta, ver settings/link-account.jsx).
// Implementación real: infrastructure/expo/repositories/ExpoContactsRepository.js
/**
 * @typedef {Object} PickedContact
 * @property {string|null} name
 * @property {string} phone - El primer teléfono guardado en ese contacto (si tiene varios, se usa el primero — de momento no se deja elegir cuál).
 *
 * @typedef {Object} IContactsRepository
 * @property {() => Promise<PickedContact|null>} pickContact - Abre el selector nativo de contactos. Devuelve `null` si el usuario cancela, o si el contacto elegido no tiene ningún teléfono guardado.
 */

export {};
