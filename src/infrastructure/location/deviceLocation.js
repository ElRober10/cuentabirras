import * as Location from 'expo-location';

// Igual que withTimeout en app/(app)/_layout.jsx (para la huella): si algo
// tarda más de `ms`, seguimos adelante con `null` en vez de esperar
// indefinidamente.
function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);
}

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
        return { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
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

      return { latitude: position.coords.latitude, longitude: position.coords.longitude };
    } catch {
      return null;
    }
  },
};
