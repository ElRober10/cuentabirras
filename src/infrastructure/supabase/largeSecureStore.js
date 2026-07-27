import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';

// PROBLEMA que resuelve esta clase: `expo-secure-store` es el sitio "seguro"
// normal para guardar cosas sensibles en el móvil, pero en Android tiene un
// límite de ~2048 bytes por valor. La sesión de Supabase (el token de acceso
// + el de refresco + datos del usuario) casi siempre pesa MÁS que eso. Si
// intentas guardarla ahí tal cual, falla en silencio: parece que funciona
// mientras la app está abierta, pero al cerrarla y reabrirla no hay nada
// guardado (esto es justo el bug que tuvimos con la biometría).
//
// SOLUCIÓN: en vez de guardar el token en SecureStore, lo ciframos
// (AES) y el resultado cifrado (que puede pesar lo que sea) lo guardamos en
// AsyncStorage (sin límite de tamaño). La CLAVE con la que ciframos sí es
// pequeña, así que esa sí cabe en SecureStore. Resultado: nadie puede leer
// el token con solo mirar AsyncStorage (verían basura cifrada), y solo nuestra
// app —que tiene la clave en SecureStore— puede descifrarlo.
//
// Esta clase implementa 3 métodos (getItem/setItem/removeItem) porque
// Supabase espera exactamente esa forma para guardar la sesión (se le pasa
// en client.js como `auth.storage`).
export class LargeSecureStore {
  // Cifra `value` con una clave aleatoria nueva, guarda esa clave en
  // SecureStore (asociada a `key`) y devuelve el texto ya cifrado.
  async _encrypt(key, value) {
    // Genera 256 bits (32 bytes) totalmente al azar: la clave de cifrado.
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
    // AES en modo "CTR": un algoritmo de cifrado simétrico estándar.
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    // La clave (pequeña, ~64 caracteres en hexadecimal) sí cabe en SecureStore.
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));

    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  // Proceso inverso: recupera la clave de SecureStore y descifra el valor.
  async _decrypt(key, value) {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return null;

    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1),
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));

    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  // Estos 3 métodos son los que Supabase llama realmente. Por fuera se
  // comportan como un simple "guarda/lee/borra por clave", pero por dentro
  // cifran y guardan en dos sitios distintos (ver arriba).
  async getItem(key) {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    return this._decrypt(key, encrypted);
  }

  async setItem(key, value) {
    const encrypted = await this._encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }

  async removeItem(key) {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
}
