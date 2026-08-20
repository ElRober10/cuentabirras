import { registerSchema } from '../../../src/application/auth/registerSchema';

function validData(overrides = {}) {
  return {
    firstName: 'Roberto',
    lastName: 'Sanz',
    email: 'roberto@test.com',
    phone: '',
    password: 'password123',
    confirmPassword: 'password123',
    termsAccepted: true,
    ...overrides,
  };
}

describe('registerSchema', () => {
  it('acepta datos válidos', () => {
    expect(registerSchema.safeParse(validData()).success).toBe(true);
  });

  it('rechaza nombre vacío', () => {
    expect(registerSchema.safeParse(validData({ firstName: '' })).success).toBe(false);
  });

  it('rechaza apellido vacío', () => {
    expect(registerSchema.safeParse(validData({ lastName: '' })).success).toBe(false);
  });

  it('rechaza email mal formado', () => {
    expect(registerSchema.safeParse(validData({ email: 'no-es-email' })).success).toBe(false);
  });

  it('el teléfono es opcional', () => {
    const { phone, ...rest } = validData();
    expect(registerSchema.safeParse(rest).success).toBe(true);
  });

  it('rechaza contraseñas menores de 8 caracteres', () => {
    const result = registerSchema.safeParse(
      validData({ password: 'abc123', confirmPassword: 'abc123' }),
    );
    expect(result.success).toBe(false);
  });

  it('rechaza si las contraseñas no coinciden, marcando confirmPassword', () => {
    const result = registerSchema.safeParse(validData({ confirmPassword: 'otraCosa123' }));
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['confirmPassword']);
  });

  it('rechaza si no se aceptan los términos', () => {
    expect(registerSchema.safeParse(validData({ termsAccepted: false })).success).toBe(false);
  });
});
