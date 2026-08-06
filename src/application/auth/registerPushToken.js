import { container } from '../../di/container';

// Se llama una vez, justo después de iniciar sesión (ver app/(app)/_layout.jsx)
// — pide permiso de notificaciones si hace falta, consigue el token de push
// de este dispositivo y lo guarda en el perfil. "Best effort" en los dos
// pasos: si algo falla (Expo Go, sin permiso, sin Play Services...) esta
// función no lanza, simplemente no queda ningún token guardado y el usuario
// se queda sin push en ese dispositivo — nunca debe bloquear el login por esto.
export async function registerPushToken() {
  const token = await container.pushNotificationRepository.registerForPushNotifications();
  if (!token) return;

  try {
    await container.authRepository.updatePushToken(token);
  } catch (error) {
    console.warn('No se pudo guardar el token de notificaciones push:', error);
  }
}
