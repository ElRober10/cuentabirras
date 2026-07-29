// Caso de uso "puro": no llama a Supabase ni a nada externo, solo hace un
// cálculo a partir de datos que ya tienes (la lista de TabItem de una
// cuenta). Se puede probar sin conexión ni base de datos, y se puede llamar
// tanto en la pantalla de la cuenta abierta como, más adelante, en el
// historial de cuentas cerradas.
//
// Una bebida añadida "sin saber el precio" tiene priceCentsAtAdd null — no
// suma nada al total (no hay otra cosa razonable que hacer), pero el total
// resultante ya no es del todo fiable — ver hasMissingPrices más abajo,
// para avisar de eso en pantalla.
export function computeTabTotalCents(tabItems) {
  return tabItems.reduce((total, item) => total + (item.priceCentsAtAdd ?? 0) * item.quantity, 0);
}

export function hasMissingPrices(tabItems) {
  return tabItems.some((item) => item.priceCentsAtAdd == null);
}
