import * as Crypto from 'expo-crypto';

// Sign in with Apple con Supabase necesita un "nonce" (número usado una sola
// vez) para atar la petición nativa a Apple con el canje del token en
// Supabase, y que nadie pueda reutilizar un identityToken robado:
//  - a Apple se le manda el HASH (SHA-256) del nonce  -> signInAsync({ nonce })
//  - a Supabase se le manda el nonce EN CLARO         -> signInWithIdToken({ nonce })
// Supabase comprueba que el hash del que le damos coincide con el que Apple
// metió dentro del identityToken.

export function generateRawNonce() {
  // Dos UUID v4 concatenados sin guiones = 64 hex de entropía, de sobra.
  return (Crypto.randomUUID() + Crypto.randomUUID()).replace(/-/g, '');
}

export function hashNonce(rawNonce) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
}
