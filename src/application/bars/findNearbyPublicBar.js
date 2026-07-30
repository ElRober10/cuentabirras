import { container } from '../../di/container';
import { distanceInMeters } from '../../shared/utils/geo';

// Umbral de "esto podría ser el mismo bar": 500 metros. Ajustable si con el
// uso real resulta demasiado (o poco) sensible.
const NEARBY_THRESHOLD_METERS = 500;

// Se llama justo ANTES de crear un bar nuevo (desde la pantalla bars/new.jsx),
// solo cuando sí tenemos coordenadas (si no las tenemos, el bar va a salir
// privado y no puede chocar con el de nadie — no hace falta comprobar nada).
// Devuelve TODOS los bares públicos a menos de 500m, ordenados por
// cercanía (el más cercano primero), o un array vacío si no hay ninguno —
// puede haber varios bares muy juntos (terraza + interior, dos bares
// pegados, etc.), así que se deja elegir en vez de asumir que el más
// cercano es "el bueno".
export async function findNearbyPublicBars({ latitude, longitude }) {
  if (latitude == null || longitude == null) return [];

  const bars = await container.barRepository.listVisibleBars();

  return bars
    .filter((bar) => bar.latitude != null) // solo bares públicos tienen sentido aquí
    .map((bar) => ({ bar, distance: distanceInMeters({ latitude, longitude }, bar) }))
    .filter(({ distance }) => distance <= NEARBY_THRESHOLD_METERS)
    .sort((a, b) => a.distance - b.distance)
    .map(({ bar }) => bar);
}
