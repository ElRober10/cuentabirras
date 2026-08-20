import { loginSchema } from '../../../src/application/auth/loginSchema';

describe('loginSchema', () => {
  it('acepta email y contraseña válidos', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: 'x' });
    expect(result.success).toBe(true);
  });

  it('rechaza un email mal formado', () => {
    const result = loginSchema.safeParse({ email: 'no-es-un-email', password: 'x' });
    expect(result.success).toBe(false);
  });

  it('rechaza contraseña vacía', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: '' });
    expect(result.success).toBe(false);
  });

  it('no exige un mínimo de 8 caracteres (a diferencia de registerSchema)', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: 'abc' });
    expect(result.success).toBe(true);
  });
});
