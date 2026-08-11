import { container } from '../../di/container';
import { deviceLocation } from '../../infrastructure/location/deviceLocation';
import { nearbyRadiusSetting } from '../../infrastructure/settings/nearbyRadiusSetting';
import { distanceInMeters } from '../../shared/utils/geo';

// Este es un "caso de uso" de verdad (no un simple pass-through al
// repositorio): junta CUATRO fuentes de datos (los bares de Supabase, tu
// posición GPS del móvil, tus cuentas pasadas, y el radio configurado en
// Ajustes) y aplica dos reglas de negocio: qué bares se enseñan (filtro) y
// en qué orden (distancia primero si hay ubicación, número de veces que
// has ido a ese bar como segundo criterio, y alfabético como desempate).
export async function listBarsSortedByDistance() {
  const [bars, position, myTabs, radiusKm] = await Promise.all([
    container.barRepository.listVisibleBars(),
    deviceLocation.getCurrentPosition(), // puede devolver null si no hay permiso — lo manejamos abajo
    container.tabRepository.listAllForCurrentUser(),
    nearbyRadiusSetting.get(),
  ]);

  // Filtro: solo bares dentro del radio configurado — salvo los "privados"
  // (sin coordenadas, ver migración 0018), que siempre se enseñan, y salvo
  // que no tengamos tu posición (sin permiso de ubicación), en cuyo caso
  // no se filtra nada porque no hay con qué comparar.
  const radiusMeters = radiusKm * 1000;
  const visibleBars = position
    ? bars.filter((bar) => bar.latitude == null || distanceInMeters(position, bar) <= radiusMeters)
    : bars;

  // Cuántas cuentas (tabs) has tenido en cada bar, sea cual sea su estado.
  const visitsByBar = {};
  for (const tab of myTabs) {
    visitsByBar[tab.barId] = (visitsByBar[tab.barId] ?? 0) + 1;
  }

  return [...visibleBars].sort((a, b) => {
    // 1) Distancia, solo si tenemos tu posición actual. Los bares privados
    // (sin coordenadas) reciben Infinity, así que nunca "ganan" por distancia.
    if (position) {
      const distanceA = a.latitude != null ? distanceInMeters(position, a) : Infinity;
      const distanceB = b.latitude != null ? distanceInMeters(position, b) : Infinity;
      if (distanceA !== distanceB) return distanceA - distanceB;
    }

    // 2) Número de visitas (más visitas primero).
    const visitsA = visitsByBar[a.id] ?? 0;
    const visitsB = visitsByBar[b.id] ?? 0;
    if (visitsA !== visitsB) return visitsB - visitsA;

    // 3) Alfabético, como último desempate.
    return a.name.localeCompare(b.name);
  });
}
