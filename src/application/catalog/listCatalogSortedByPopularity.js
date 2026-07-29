import { container } from '../../di/container';

// Orden de las tarjetas de bebidas: primero lo que más pides TÚ, luego —a
// igualdad— lo que más pide el grupo entero, y por último, alfabético (para
// que las bebidas nuevas o poco pedidas no queden en un orden aleatorio).
export async function listCatalogSortedByPopularity(barId) {
  const [items, popularity] = await Promise.all([
    container.catalogRepository.listByBar(barId),
    container.catalogRepository.getPopularity(barId),
  ]);

  const popularityByItem = new Map(
    popularity.map((row) => [
      row.catalog_item_id,
      { mine: Number(row.my_quantity), total: Number(row.total_quantity) },
    ]),
  );

  return [...items].sort((a, b) => {
    const popA = popularityByItem.get(a.id) ?? { mine: 0, total: 0 };
    const popB = popularityByItem.get(b.id) ?? { mine: 0, total: 0 };
    if (popA.mine !== popB.mine) return popB.mine - popA.mine;
    if (popA.total !== popB.total) return popB.total - popA.total;
    return a.name.localeCompare(b.name, 'es');
  });
}
