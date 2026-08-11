import * as SecureStore from 'expo-secure-store';

// Preferencia "¿en qué radio quiero ver bares?" — solo un número, guardado
// en este dispositivo (no en Supabase, no hace falta que viaje entre
// dispositivos). Mismo patrón que biometricAuth.js para su preferencia de
// huella.
const PREFERENCE_KEY = 'nearby_radius_km';
export const DEFAULT_RADIUS_KM = 2;

export const nearbyRadiusSetting = {
  async get() {
    const value = await SecureStore.getItemAsync(PREFERENCE_KEY);
    const parsed = value != null ? Number(value) : DEFAULT_RADIUS_KM;
    // Si el valor guardado no fuera un número válido por algún motivo
    // (dato corrupto, edición manual...), mejor volver al valor por
    // defecto que romper el listado de bares.
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RADIUS_KM;
  },

  async set(radiusKm) {
    await SecureStore.setItemAsync(PREFERENCE_KEY, String(radiusKm));
  },
};
