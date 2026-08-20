import { createEditProfileSchema } from '../../../src/application/auth/editProfileSchema';

function validData(overrides = {}) {
  return {
    firstName: 'Roberto',
    lastName: 'Sanz',
    email: 'roberto@test.com',
    phone: '',
    newPassword: '',
    confirmNewPassword: '',
    termsAccepted: false,
    ...overrides,
  };
}

describe('createEditProfileSchema(requireTerms = false)', () => {
  const schema = createEditProfileSchema(false);

  it('acepta datos válidos sin tocar la contraseña', () => {
    expect(schema.safeParse(validData()).success).toBe(true);
  });

  it('permite dejar newPassword vacío (no la cambia)', () => {
    expect(schema.safeParse(validData({ newPassword: '', confirmNewPassword: '' })).success).toBe(
      true,
    );
  });

  it('rechaza una newPassword de menos de 8 caracteres', () => {
    const result = schema.safeParse(
      validData({ newPassword: 'abc123', confirmNewPassword: 'abc123' }),
    );
    expect(result.success).toBe(false);
  });

  it('rechaza si newPassword y confirmNewPassword no coinciden', () => {
    const result = schema.safeParse(
      validData({ newPassword: 'password123', confirmNewPassword: 'otraCosa123' }),
    );
    expect(result.success).toBe(false);
  });

  it('no exige aceptar términos cuando requireTerms es false', () => {
    expect(schema.safeParse(validData({ termsAccepted: false })).success).toBe(true);
  });
});

describe('createEditProfileSchema(requireTerms = true)', () => {
  const schema = createEditProfileSchema(true);

  it('rechaza si no se aceptan los términos', () => {
    expect(schema.safeParse(validData({ termsAccepted: false })).success).toBe(false);
  });

  it('acepta si se aceptan los términos', () => {
    expect(schema.safeParse(validData({ termsAccepted: true })).success).toBe(true);
  });
});
