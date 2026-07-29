import { container } from '../../di/container';

// Se usa cuando, teniendo una cuenta abierta, el usuario elige "nueva" en
// vez de "continuar": cierra la anterior (si había) y abre otra. Dos pasos
// que tienen que ir juntos SIEMPRE — por eso es un caso de uso y no dos
// llamadas sueltas repartidas por la pantalla.
export async function startNewTab({ barId, currentOpenTabId }) {
  if (currentOpenTabId) {
    await container.tabRepository.closeTab(currentOpenTabId);
  }
  return container.tabRepository.createTab(barId);
}
