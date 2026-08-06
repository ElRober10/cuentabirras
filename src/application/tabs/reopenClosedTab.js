import { container } from '../../di/container';

// Reabrir una cuenta cerrada desde el histórico (por si se cerró por
// error). Solo tiene sentido si NO hay ya otra cuenta abierta DE VERDAD en
// ESE MISMO bar — si la hay, no está claro cuál de las dos sería "la de
// verdad" ahora, así que se bloquea con un mensaje claro en vez de dejar
// dos cuentas abiertas a la vez en el mismo bar (rompería la regla que ya
// cumple el resto de la app).
//
// "De verdad" = con al menos una bebida añadida — mismo criterio que ya usa
// openOrResumeTab.js al entrar a un bar: se crea una fila en `tabs` en
// cuanto entras, aunque no llegues a pedir nada, y esa cuenta vacía no
// cuenta como una cuenta real. Si la única "abierta" que hay es una de
// esas, se cierra sola (así nunca quedan dos cuentas abiertas a la vez en
// el mismo bar) y se deja paso a la que se está reabriendo.
export async function reopenClosedTab({ tabId, barId }) {
  const openTab = await container.tabRepository.findOpenTabForBar(barId);
  if (openTab) {
    const items = await container.tabItemRepository.listByTab(openTab.id);
    if (items.length > 0) {
      throw new Error('Ya tienes una cuenta abierta en este bar. Ciérrala antes de reabrir esta.');
    }
    await container.tabRepository.closeTab(openTab.id);
  }
  await container.tabRepository.reopenTab(tabId);
}
