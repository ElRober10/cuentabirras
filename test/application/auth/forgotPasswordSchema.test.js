import { forgotPasswordSchema } from '../../../src/application/auth/forgotPasswordSchema';

describe('forgotPasswordSchema', () => {
  it('acepta un email válido', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'test@test.com' }).success).toBe(true);
  });

  it('rechaza un email mal formado', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'no-es-un-email' }).success).toBe(false);
  });
});
