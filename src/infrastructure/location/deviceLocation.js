import * as Location from 'expo-location';

// Igual que withTimeout en app/(app)/_layout.jsx (para la huella): si algo
// tarda más de `ms`, seguimos adelante con `null` en vez de esperar
// indefinidamente.
function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);
}

// Última posición que se consiguió de verdad, en memoria (se pierde al
// cerrar la app — no hace falta persistirla en disco). Se rellena cada vez
// que getCurrentPosition() tiene éxito, para que otras partes de la app
// (p. ej. adivinar el prefijo de un teléfono al invitar, ver
// application/invitations/normalizePhoneWithCountryCode.js) puedan
// reutilizarla SIN volver a pedir permiso ni hacer una llamada nueva al
// GPS — ya se pidió al entrar a la pantalla principal (listBarsSortedByDistance).
let cachedPosition = null;

// Envoltorio de expo-location: la ubicación es OPCIONAL en toda la app (así
// se decidió), así que esta función nunca lanza un error si el usuario
// deniega el permiso o algo falla — simplemente devuelve `null`, y quien la
// llame decide el "plan B" (bar privado, lista sin ordenar por distancia...).
export const deviceLocation = {
  async getCurrentPosition() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;

      // getLastKnownPositionAsync() devuelve al instante la última posición
      // que el sistema operativo ya tenía guardada (sin esperar al GPS) —
      // para "¿estoy cerca de este bar?" nos vale de sobra, y evita los 9-10
      // segundos que puede tardar un GPS "en frío", sobre todo en interiores.
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        cachedPosition = { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
        return cachedPosition;
      }

      // Si no hay ninguna posición previa guardada (p. ej. la primera vez
      // que se usa la app), pedimos una nueva — pero con un límite de 3
      // segundos: mejor crear el bar sin coordenadas exactas (queda
      // privado) que hacer esperar mucho al usuario.
      const position = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
        3000,
      );
      if (!position) return null;

      cachedPosition = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      return cachedPosition;
    } catch {
      return null;
    }
  },

  // Devuelve al instante la última posición ya conseguida (o `null` si
  // todavía no se ha conseguido ninguna en esta sesión de la app) — sin
  // tocar el GPS ni el permiso. Pensado para casos como el de arriba, donde
  // no merece la pena pedir una posición nueva solo para eso.
  getLastKnownPosition() {
    return cachedPosition;
  },
};
