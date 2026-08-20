import { createBarSchema } from '../../../src/application/bars/createBarSchema';

describe('createBarSchema', () => {
  it('acepta un nombre no vacío', () => {
    expect(createBarSchema.safeParse({ name: 'Bar Pepe' }).success).toBe(true);
  });

  it('rechaza un nombre vacío', () => {
    expect(createBarSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('rechaza un nombre que son solo espacios (se recorta antes de validar)', () => {
    expect(createBarSchema.safeParse({ name: '   ' }).success).toBe(false);
  });
});
