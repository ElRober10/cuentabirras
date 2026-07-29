// Fórmula de Haversine: calcula la distancia en línea recta (metros) entre
// dos puntos GPS, teniendo en cuenta que la Tierra es una esfera (no un
// plano). No es exacta al milímetro, pero de sobra para "¿qué bar tengo más
// cerca?" — no hace falta PostGIS ni nada más complejo para este alcance.
const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function distanceInMeters(pointA, pointB) {
  const dLat = toRadians(pointB.latitude - pointA.latitude);
  const dLon = toRadians(pointB.longitude - pointA.longitude);
  const lat1 = toRadians(pointA.latitude);
  const lat2 = toRadians(pointB.latitude);

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}
