jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async (_algo, input) => `hash(${input})`),
  randomUUID: jest.fn(() => '11111111-1111-1111-1111-111111111111'),
}));

import { generateRawNonce, hashNonce } from '../../../src/shared/utils/appleNonce';

describe('appleNonce', () => {
  it('generateRawNonce devuelve una cadena de al menos 32 caracteres sin guiones', () => {
    const nonce = generateRawNonce();
    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThanOrEqual(32);
    expect(nonce).not.toContain('-');
  });

  it('hashNonce delega en expo-crypto con SHA-256', async () => {
    const result = await hashNonce('abc');
    expect(result).toBe('hash(abc)');
  });
});
