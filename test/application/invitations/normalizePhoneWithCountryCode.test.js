jest.mock('expo-location', () => ({
  reverseGeocodeAsync: jest.fn(),
}));
jest.mock('../../../src/infrastructure/location/deviceLocation', () => ({
  deviceLocation: { getLastKnownPosition: jest.fn() },
}));

import * as Location from 'expo-location';

import { deviceLocation } from '../../../src/infrastructure/location/deviceLocation';
import { normalizePhoneWithCountryCode } from '../../../src/application/invitations/normalizePhoneWithCountryCode';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('normalizePhoneWithCountryCode', () => {
  it('deja el número tal cual si ya empieza por +', async () => {
    expect(await normalizePhoneWithCountryCode('+34612345678')).toBe('+34612345678');
    expect(deviceLocation.getLastKnownPosition).not.toHaveBeenCalled();
  });

  it('convierte el prefijo internacional 00 a +', async () => {
    expect(await normalizePhoneWithCountryCode('0034612345678')).toBe('+34612345678');
  });

  it('usa España (34) por defecto si no hay posición conocida', async () => {
    deviceLocation.getLastKnownPosition.mockReturnValue(null);

    expect(await normalizePhoneWithCountryCode('612345678')).toBe('+34612345678');
    expect(Location.reverseGeocodeAsync).not.toHaveBeenCalled();
  });

  it('adivina el prefijo del país a partir de la última posición conocida', async () => {
    deviceLocation.getLastKnownPosition.mockReturnValue({ latitude: 48.85, longitude: 2.35 });
    Location.reverseGeocodeAsync.mockResolvedValue([{ isoCountryCode: 'FR' }]);

    expect(await normalizePhoneWithCountryCode('612345678')).toBe('+33612345678');
  });

  it('usa España por defecto si el país detectado no está en la tabla de prefijos', async () => {
    deviceLocation.getLastKnownPosition.mockReturnValue({ latitude: 0, longitude: 0 });
    Location.reverseGeocodeAsync.mockResolvedValue([{ isoCountryCode: 'XX' }]);

    expect(await normalizePhoneWithCountryCode('612345678')).toBe('+34612345678');
  });

  it('usa España por defecto si falla la geolocalización inversa', async () => {
    deviceLocation.getLastKnownPosition.mockReturnValue({ latitude: 48.85, longitude: 2.35 });
    Location.reverseGeocodeAsync.mockRejectedValue(new Error('sin red'));

    expect(await normalizePhoneWithCountryCode('612345678')).toBe('+34612345678');
  });

  it('quita espacios sueltos antes de comprobar el prefijo', async () => {
    expect(await normalizePhoneWithCountryCode('  +34612345678  ')).toBe('+34612345678');
  });
});
