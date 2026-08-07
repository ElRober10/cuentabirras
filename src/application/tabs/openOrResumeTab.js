import { container } from '../../di/container';

// La regla de negocio de "entrar a un bar": si NO había cuenta abierta, se
// crea una nueva automáticamente, sin preguntar nada (así lo especificamos).
// Si SÍ había una CON ALGO DENTRO, se devuelve tal cual, marcada con
// `alreadyOpen: true` — la PANTALLA es quien decide si, con ese dato,
// pregunta "continuar o nueva" (eso es una decisión de interfaz, no de este
// caso de uso).
//
// Una cuenta abierta pero sin ningún producto añadido no cuenta como
// "abierta de verdad": no tiene sentido preguntar "continuar o nueva" sobre
// una cuenta vacía. Por eso, salvo que mi propia cuenta ya tenga contenido
// real, delegamos TODA la decisión en openOrJoinTab (RPC, migración 0027):
// si mi pareja vinculada ya tiene una cuenta abierta con algo dentro en
// este mismo bar, me une a la suya (cerrando antes la mía vacía, si tenía);
// si no, reutiliza mi vacía o crea una nueva. Bug real que motivó mover
// esto al servidor (probado 2026-08-07): si esta comprobación se hacía solo
// aquí en el cliente, "ya tenía yo una cuenta abierta" ganaba SIEMPRE,
// aunque estuviera vacía, y nunca se llegaba a mirar si la pareja tenía una
// con la que unirse.
export async function openOrResumeTab(barId) {
  const openTab = await container.tabRepository.findOpenTabForBar(barId);
  if (openTab) {
    const items = await container.tabItemRepository.listByTab(openTab.id);
    if (items.length > 0) {
      return { tab: openTab, alreadyOpen: true };
    }
  }

  const tab = await container.tabRepository.openOrJoinTab(barId);
  return { tab, alreadyOpen: false };
}
