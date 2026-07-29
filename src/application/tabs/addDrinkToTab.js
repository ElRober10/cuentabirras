import { container } from '../../di/container';

// El corazón de "añadir una bebida": si `existingItem` viene informado (el
// usuario eligió una bebida que YA estaba en el catálogo del bar), se usa su
// precio actual directamente, sin preguntar nada. Si en cambio viene
// `newItem` (nombre + categoría + color que el usuario acaba de escribir,
// porque esa bebida no existía todavía en este bar), primero se crea en el
// catálogo (con o sin precio, es opcional) y LUEGO se añade a la cuenta.
//
// `priceCentsOverride` es el precio que el usuario acaba de escribir en la
// "ventanita de precio" (porque la bebida no tenía, o porque lo estaba
// corrigiendo) — si viene informado, se usa ESE precio para añadir a la
// cuenta, y de paso se guarda también en el catálogo para la próxima vez.
//
// Si al final no hay ningún precio disponible (ni en el catálogo ni como
// override), no se puede añadir — la pantalla debe pedir el precio ANTES de
// llamar aquí en ese caso, SALVO que venga `allowMissingPrice: true` (botón
// "No sé el precio" en el diálogo): entonces se añade igualmente con precio
// null — la cuenta lo señala como "puede no ser exacta" (ver
// hasMissingPrices en computeTabTotal.js) hasta que alguien lo corrija.
export async function addDrinkToTab({
  tabId,
  barId,
  existingItem,
  newItem,
  quantity = 1,
  priceCentsOverride,
  allowMissingPrice = false,
}) {
  const catalogItem =
    existingItem ??
    (await container.catalogRepository.createItem({
      barId,
      name: newItem.name,
      category: newItem.category,
      color: newItem.color,
      icon: newItem.icon ?? null,
      priceCents: newItem.priceCents ?? null,
    }));

  const priceCents = priceCentsOverride ?? catalogItem.priceCents ?? null;
  if (priceCents == null && !allowMissingPrice) {
    throw new Error('Esta bebida todavía no tiene precio.');
  }

  if (priceCentsOverride != null && priceCentsOverride !== catalogItem.priceCents) {
    await container.catalogRepository.updatePrice({ catalogItemId: catalogItem.id, priceCents: priceCentsOverride });
  }

  return container.tabItemRepository.addItem({
    tabId,
    catalogItemId: catalogItem.id,
    priceCentsAtAdd: priceCents,
    quantity,
  });
}
