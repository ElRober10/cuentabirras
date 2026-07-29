import { container } from '../../di/container';

// La regla de negocio de "entrar a un bar": si NO había cuenta abierta, se
// crea una nueva automáticamente, sin preguntar nada (así lo especificamos).
// Si SÍ había una, se devuelve tal cual, marcada con `alreadyOpen: true` —
// la PANTALLA es quien decide si, con ese dato, pregunta "continuar o nueva"
// (eso es una decisión de interfaz, no de este caso de uso).
//
// Una cuenta abierta pero sin ningún producto añadido no cuenta como
// "abierta de verdad": no tiene sentido preguntar "continuar o nueva" sobre
// una cuenta vacía. En ese caso se reutiliza esa misma cuenta (no hace
// falta crear otra) pero se entra directo, sin preguntar nada.
export async function openOrResumeTab(barId) {
  const openTab = await container.tabRepository.findOpenTabForBar(barId);
  if (openTab) {
    const items = await container.tabItemRepository.listByTab(openTab.id);
    return { tab: openTab, alreadyOpen: items.length > 0 };
  }

  const newTab = await container.tabRepository.createTab(barId);
  return { tab: newTab, alreadyOpen: false };
}
