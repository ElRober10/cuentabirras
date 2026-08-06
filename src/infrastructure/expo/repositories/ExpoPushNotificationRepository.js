import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// Desde el SDK 53, Expo Go ni siquiera deja IMPORTAR expo-notifications sin
// pegar un "Uncaught Error" que tira abajo toda la app (comprobado en
// real: el error salta al cargar el módulo, no al intentar usarlo — por
// eso un try/catch alrededor de la llamada no sirve de nada, hay que evitar
// el `import`/`require` del todo). Así que aquí NUNCA se hace `import
// * as Notifications from 'expo-notifications'` arriba del fichero — se
// carga con un `require(...)` perezoso, solo dentro de
// registerForPushNotifications(), y solo cuando NO estamos en Expo Go.
//
// OJO: `StoreClient` también incluye los "development builds" hechos con
// expo-dev-client (que SÍ soportan push) — aquí no se distingue de Expo Go
// a propósito, porque este proyecto no usa development builds (usa
// `eas build --profile preview`, que da `standalone`). Si algún día se
// empieza a usar expo-dev-client, esta comprobación habría que afinarla.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Esta es la implementación REAL del contrato IPushNotificationRepository
// (domain/repositories/IPushNotificationRepository.js). Vive en
// infrastructure/expo/ (no infrastructure/supabase/) porque no habla con
// Supabase — es una integración con el propio dispositivo/con el servicio
// de push de Expo, como biometricAuth.js o ExpoContactsRepository.js.
export const expoPushNotificationRepository = {
  async registerForPushNotifications() {
    if (isExpoGo) return null;

    try {
      const Notifications = require('expo-notifications');

      // Igual que antes: que las notificaciones se muestren mientras la app
      // está en primer plano. Se registra aquí (no arriba del fichero) por
      // el mismo motivo que el require perezoso — para que nunca se toque
      // expo-notifications en Expo Go.
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });

      if (Platform.OS === 'android') {
        // En Android hace falta un "canal" antes de poder recibir nada —
        // sin esto, las notificaciones push llegarían sin sonido ni forma
        // de que el usuario las silencie por separado desde los ajustes
        // del sistema.
        await Notifications.setNotificationChannelAsync('default', {
          name: 'General',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let status = existingStatus;
      if (status !== 'granted') {
        ({ status } = await Notifications.requestPermissionsAsync());
      }
      if (status !== 'granted') return null;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) return null;

      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      return token;
    } catch (error) {
      // Por si algo más falla (sin Google Play Services, permiso denegado
      // de otra forma...) — nunca debe romper el login por esto, solo nos
      // quedamos sin push en ese dispositivo.
      console.warn('No se pudo registrar el token de notificaciones push:', error);
      return null;
    }
  },
};
