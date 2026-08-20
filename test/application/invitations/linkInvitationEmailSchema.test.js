import { linkInvitationEmailSchema } from '../../../src/application/invitations/linkInvitationEmailSchema';

describe('linkInvitationEmailSchema', () => {
  it('acepta un email válido', () => {
    expect(linkInvitationEmailSchema.safeParse({ email: 'pareja@test.com' }).success).toBe(true);
  });

  it('rechaza un email mal formado', () => {
    expect(linkInvitationEmailSchema.safeParse({ email: 'no-es-un-email' }).success).toBe(false);
  });
});
