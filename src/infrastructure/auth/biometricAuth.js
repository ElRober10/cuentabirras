// Todo lo relacionado con el sensor de huella/Face ID del móvil vive aquí.
// Importante: esto NO sustituye el login de Supabase, solo "desbloquea" una
// sesión que ya existe (ver app/(app)/_layout.jsx, que es quien usa esto).
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// La preferencia "¿el usuario quiere usar huella?" se guarda con esta clave
// en SecureStore. Es solo un 'true'/'false', pesa nada, así que no hace
// falta la clase LargeSecureStore aquí (esa es solo para la sesión de Supabase).
const PREFERENCE_KEY = 'biometric_enabled';

export const biometricAuth = {
  // ¿Este móvil PUEDE usar biometría? Dos preguntas distintas:
  // - hasHardwareAsync: ¿tiene sensor de huella/Face ID el dispositivo?
  // - isEnrolledAsync: ¿el usuario tiene configurada al menos una huella/cara
  //   en los ajustes del sistema operativo (no en nuestra app)?
  // Si cualquiera de las dos es falsa, no podemos pedir biometría.
  async isSupported() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },

  // ¿El usuario ACTIVÓ el interruptor de biometría en la pantalla de inicio?
  // (independiente de si el móvil la soporta o no).
  async isEnabled() {
    const value = await SecureStore.getItemAsync(PREFERENCE_KEY);
    return value === 'true';
  },

  async setEnabled(enabled) {
    await SecureStore.setItemAsync(PREFERENCE_KEY, enabled ? 'true' : 'false');
  },

  // Lanza el diálogo nativo del sistema (huella/Face ID/PIN de respaldo) y
  // espera a que el usuario responda. Devuelve true/false según si acertó.
  async authenticate() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquea CuentaBirras',
      cancelLabel: 'Cancelar',
    });
    return result.success;
  },
};
