import { newPasswordSchema } from '../../../src/application/auth/newPasswordSchema';

describe('newPasswordSchema', () => {
  it('acepta dos contraseñas iguales de al menos 8 caracteres', () => {
    const result = newPasswordSchema.safeParse({
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza contraseñas menores de 8 caracteres', () => {
    const result = newPasswordSchema.safeParse({ password: 'abc123', confirmPassword: 'abc123' });
    expect(result.success).toBe(false);
  });

  it('rechaza si las contraseñas no coinciden', () => {
    const result = newPasswordSchema.safeParse({
      password: 'password123',
      confirmPassword: 'otraCosa123',
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['confirmPassword']);
  });
});
