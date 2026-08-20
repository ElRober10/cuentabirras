jest.mock('../../../src/di/container', () => ({
  container: {
    accountLinkRepository: {
      sendInvitation: jest.fn(),
      sendInvitationEmail: jest.fn(),
      notifyInvitationCreated: jest.fn(),
    },
  },
}));

import { container } from '../../../src/di/container';
import { sendLinkInvitationByEmail } from '../../../src/application/invitations/sendLinkInvitationByEmail';

beforeEach(() => {
  jest.clearAllMocks();
  container.accountLinkRepository.sendInvitationEmail.mockResolvedValue();
  container.accountLinkRepository.notifyInvitationCreated.mockResolvedValue();
});

describe('sendLinkInvitationByEmail', () => {
  it('crea la invitación y manda el email', async () => {
    container.accountLinkRepository.sendInvitation.mockResolvedValue({
      requestId: 'req-1',
      matchedUserId: null,
    });

    const result = await sendLinkInvitationByEmail({ email: 'pareja@test.com' });

    expect(container.accountLinkRepository.sendInvitation).toHaveBeenCalledWith({
      email: 'pareja@test.com',
    });
    expect(container.accountLinkRepository.sendInvitationEmail).toHaveBeenCalledWith('req-1');
    expect(result).toEqual({ requestId: 'req-1', matchedUserId: null });
  });

  it('solo manda el push si el destinatario ya tiene cuenta (matchedUserId)', async () => {
    container.accountLinkRepository.sendInvitation.mockResolvedValue({
      requestId: 'req-1',
      matchedUserId: null,
    });

    await sendLinkInvitationByEmail({ email: 'pareja@test.com' });

    expect(container.accountLinkRepository.notifyInvitationCreated).not.toHaveBeenCalled();
  });

  it('manda el push cuando el destinatario ya tiene cuenta', async () => {
    container.accountLinkRepository.sendInvitation.mockResolvedValue({
      requestId: 'req-1',
      matchedUserId: 'user-2',
    });

    await sendLinkInvitationByEmail({ email: 'pareja@test.com' });

    expect(container.accountLinkRepository.notifyInvitationCreated).toHaveBeenCalledWith('req-1');
  });

  it('no lanza si falla el envío del email (best effort)', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    container.accountLinkRepository.sendInvitation.mockResolvedValue({
      requestId: 'req-1',
      matchedUserId: null,
    });
    container.accountLinkRepository.sendInvitationEmail.mockRejectedValue(new Error('SMTP caído'));

    await expect(sendLinkInvitationByEmail({ email: 'pareja@test.com' })).resolves.toEqual({
      requestId: 'req-1',
      matchedUserId: null,
    });
  });
});
