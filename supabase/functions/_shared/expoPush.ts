// Manda un push a través del servicio de Expo (gratis, sin necesitar
// credenciales de Firebase/APNs propias — Expo hace de intermediario). Un
// solo POST a esta URL vale tanto para Android como para iOS.
// https://docs.expo.dev/push-notifications/sending-notifications/
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendExpoPush(pushToken: string, title: string, body: string, data?: Record<string, unknown>) {
  // Los tokens de push de Expo tienen forma "ExponentPushToken[...]" — si
  // alguna vez llega otra cosa en profiles.push_token (null, vacío, un
  // token de un proveedor distinto), mejor no intentar mandar nada.
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) return;

  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      to: pushToken,
      title,
      body,
      data: data ?? {},
    }),
  });
}
