import { container } from '../../di/container';

// Umbral de "esto podría ser el mismo bar": 500 metros. Ajustable si con el
// uso real resulta demasiado (o poco) sensible.
const NEARBY_THRESHOLD_METERS = 500;

// Se llama justo ANTES de crear un bar nuevo (desde la pantalla bars/new.jsx),
// solo cuando sí tenemos coordenadas (si no las tenemos, el bar va a salir
// sin ubicación y nadie más podrá encontrarlo — no hace falta comprobar
// nada). La búsqueda en sí (findNearbyBars) vive en el repositorio porque
// tiene que ver bares de CUALQUIER usuario, no solo los tuyos — por eso no
// puede salir de listVisibleBars (que desde la migración 0018 solo
// devuelve los bares de los que ya eres miembro). Devuelve TODOS los
// candidatos a menos de 500m, ordenados por cercanía (el más cercano
// primero) — puede haber varios bares muy juntos (terraza + interior, dos
// bares pegados, etc.), así que se deja elegir en vez de asumir que el más
// cercano es "el bueno".
export async function findNearbyPublicBars({ latitude, longitude }) {
  if (latitude == null || longitude == null) return [];

  return container.barRepository.findNearbyBars({
    latitude,
    longitude,
    radiusMeters: NEARBY_THRESHOLD_METERS,
  });
}
