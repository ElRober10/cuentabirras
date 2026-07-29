import { container } from '../../di/container';
import { deviceLocation } from '../../infrastructure/location/deviceLocation';
import { distanceInMeters } from '../../shared/utils/geo';

// Este es un "caso de uso" de verdad (no un simple pass-through al
// repositorio): junta TRES fuentes de datos (los bares de Supabase, tu
// posición GPS del móvil, y tus cuentas pasadas) y aplica la regla de
// negocio de orden: distancia primero (si hay ubicación), número de veces
// que has ido a ese bar como segundo criterio, y alfabético como último
// desempate.
export async function listBarsSortedByDistance() {
  const [bars, position, myTabs] = await Promise.all([
    container.barRepository.listVisibleBars(),
    deviceLocation.getCurrentPosition(), // puede devolver null si no hay permiso — lo manejamos abajo
    container.tabRepository.listAllForCurrentUser(),
  ]);

  // Cuántas cuentas (tabs) has tenido en cada bar, sea cual sea su estado.
  const visitsByBar = {};
  for (const tab of myTabs) {
    visitsByBar[tab.barId] = (visitsByBar[tab.barId] ?? 0) + 1;
  }

  return [...bars].sort((a, b) => {
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
