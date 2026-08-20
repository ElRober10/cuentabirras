jest.mock('../../../src/di/container', () => ({
  container: {
    accountLinkRepository: {
      sendInvitation: jest.fn(),
      notifyInvitationCreated: jest.fn(),
    },
  },
}));
jest.mock('../../../src/shared/constants/appDownloadLinks', () => ({
  APP_DOWNLOAD_LINKS: {
    android: 'https://play.google.com/store/apps/details?id=com.elrober10.cuentabirras',
    ios: '',
  },
}));

import { Linking } from 'react-native';

import { container } from '../../../src/di/container';
import { sendLinkInvitationByPhone } from '../../../src/application/invitations/sendLinkInvitationByPhone';

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'openURL').mockResolvedValue();
});

describe('sendLinkInvitationByPhone', () => {
  it('normaliza el teléfono, crea la invitación y abre WhatsApp', async () => {
    container.accountLinkRepository.sendInvitation.mockResolvedValue({
      requestId: 'req-1',
      matchedUserId: null,
    });

    const result = await sendLinkInvitationByPhone({ phone: '+34612345678' });

    expect(container.accountLinkRepository.sendInvitation).toHaveBeenCalledWith({
      phone: '+34612345678',
    });
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    const [url] = Linking.openURL.mock.calls[0];
    expect(url).toContain('https://wa.me/34612345678?text=');
    expect(decodeURIComponent(url.split('?text=')[1])).toContain(
      'Android: https://play.google.com/store/apps/details?id=com.elrober10.cuentabirras',
    );
    expect(result).toEqual({ requestId: 'req-1', matchedUserId: null });
  });

  it('no repite el prefijo si el número ya lo lleva con 00', async () => {
    container.accountLinkRepository.sendInvitation.mockResolvedValue({
      requestId: 'req-1',
      matchedUserId: null,
    });

    await sendLinkInvitationByPhone({ phone: '0034612345678' });

    expect(container.accountLinkRepository.sendInvitation).toHaveBeenCalledWith({
      phone: '+34612345678',
    });
  });

  it('manda el push solo si el destinatario ya tiene cuenta', async () => {
    container.accountLinkRepository.sendInvitation.mockResolvedValue({
      requestId: 'req-1',
      matchedUserId: 'user-2',
    });
    container.accountLinkRepository.notifyInvitationCreated.mockResolvedValue();

    await sendLinkInvitationByPhone({ phone: '+34612345678' });

    expect(container.accountLinkRepository.notifyInvitationCreated).toHaveBeenCalledWith('req-1');
  });
});
