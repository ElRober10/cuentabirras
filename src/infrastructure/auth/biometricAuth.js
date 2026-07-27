import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const PREFERENCE_KEY = 'biometric_enabled';

export const biometricAuth = {
  async isSupported() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },

  async isEnabled() {
    const value = await SecureStore.getItemAsync(PREFERENCE_KEY);
    return value === 'true';
  },

  async setEnabled(enabled) {
    await SecureStore.setItemAsync(PREFERENCE_KEY, enabled ? 'true' : 'false');
  },

  async authenticate() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquea CuentaBirras',
      cancelLabel: 'Cancelar',
    });
    return result.success;
  },
};
