// Contrato para notificaciones push de verdad (Fase D2). Implementación
// real: infrastructure/expo/repositories/ExpoPushNotificationRepository.js
/**
 * @typedef {Object} IPushNotificationRepository
 * @property {() => Promise<string|null>} registerForPushNotifications - Pide permiso (si hace falta) y devuelve el token de push de Expo de este dispositivo, o `null` si no hay permiso o el dispositivo no lo soporta (p. ej. un emulador sin Google Play Services). Nunca lanza.
 */

export {};
