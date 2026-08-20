import { distanceInMeters } from '../../../src/shared/utils/geo';

describe('distanceInMeters', () => {
  it('devuelve 0 para el mismo punto', () => {
    const point = { latitude: 40.4168, longitude: -3.7038 };
    expect(distanceInMeters(point, point)).toBe(0);
  });

  it('calcula una distancia conocida entre dos ciudades (Madrid-Barcelona, ~500km)', () => {
    const madrid = { latitude: 40.4168, longitude: -3.7038 };
    const barcelona = { latitude: 41.3874, longitude: 2.1686 };
    const distance = distanceInMeters(madrid, barcelona);
    expect(distance).toBeGreaterThan(490000);
    expect(distance).toBeLessThan(510000);
  });

  it('es simétrica (A→B es igual que B→A)', () => {
    const a = { latitude: 39.6113833, longitude: -4.9064717 };
    const b = { latitude: 39.5720956, longitude: -4.8048163 };
    expect(distanceInMeters(a, b)).toBeCloseTo(distanceInMeters(b, a), 6);
  });

  it('detecta dos puntos a menos de 500m como cercanos', () => {
    const barA = { latitude: 39.6113833, longitude: -4.9064717 };
    const barB = { latitude: 39.6112346, longitude: -4.9033667 };
    expect(distanceInMeters(barA, barB)).toBeLessThan(500);
  });
});
