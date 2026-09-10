import * as SecureStore from 'expo-secure-store';

// Preferencia "ya me han explicado por qué no salen todos mis bares, no me
// lo vuelvas a contar". Solo un booleano, guardado en este dispositivo
// (mismo patrón que nearbyRadiusSetting). Una vez el usuario marca "no
// volver a mostrar" en el aviso de la pantalla de inicio, esto se pone a
// true y el aviso no vuelve a aparecer nunca en este móvil.
const PREFERENCE_KEY = 'hidden_bars_notice_dismissed';

export const hiddenBarsNoticeSetting = {
  async isDismissed() {
    const value = await SecureStore.getItemAsync(PREFERENCE_KEY);
    return value === 'true';
  },

  async dismiss() {
    await SecureStore.setItemAsync(PREFERENCE_KEY, 'true');
  },
};
