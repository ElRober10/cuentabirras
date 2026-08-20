jest.mock('../../../src/di/container', () => ({
  container: {
    pushNotificationRepository: { registerForPushNotifications: jest.fn() },
    authRepository: { updatePushToken: jest.fn() },
  },
}));

import { container } from '../../../src/di/container';
import { registerPushToken } from '../../../src/application/auth/registerPushToken';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('registerPushToken', () => {
  it('guarda el token si se consigue uno', async () => {
    container.pushNotificationRepository.registerForPushNotifications.mockResolvedValue(
      'token-123',
    );
    container.authRepository.updatePushToken.mockResolvedValue();

    await registerPushToken();

    expect(container.authRepository.updatePushToken).toHaveBeenCalledWith('token-123');
  });

  it('no intenta guardar nada si no hay token (Expo Go, sin permiso...)', async () => {
    container.pushNotificationRepository.registerForPushNotifications.mockResolvedValue(null);

    await registerPushToken();

    expect(container.authRepository.updatePushToken).not.toHaveBeenCalled();
  });

  it('no lanza si falla el guardado del token (best effort)', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    container.pushNotificationRepository.registerForPushNotifications.mockResolvedValue(
      'token-123',
    );
    container.authRepository.updatePushToken.mockRejectedValue(new Error('red caída'));

    await expect(registerPushToken()).resolves.toBeUndefined();
  });
});
