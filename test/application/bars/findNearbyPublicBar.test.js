jest.mock('../../../src/di/container', () => ({
  container: {
    barRepository: {
      findNearbyBars: jest.fn(),
    },
  },
}));

import { container } from '../../../src/di/container';
import { findNearbyPublicBars } from '../../../src/application/bars/findNearbyPublicBar';

describe('findNearbyPublicBars', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no busca nada si faltan las coordenadas', async () => {
    const result = await findNearbyPublicBars({ latitude: null, longitude: null });
    expect(result).toEqual([]);
    expect(container.barRepository.findNearbyBars).not.toHaveBeenCalled();
  });

  it('busca con un radio de 500m', async () => {
    container.barRepository.findNearbyBars.mockResolvedValue([
      { id: '1', name: 'Bar Pepe', distance_meters: 42 },
    ]);

    const result = await findNearbyPublicBars({ latitude: 40, longitude: -3 });

    expect(container.barRepository.findNearbyBars).toHaveBeenCalledWith({
      latitude: 40,
      longitude: -3,
      radiusMeters: 500,
    });
    expect(result).toEqual([{ id: '1', name: 'Bar Pepe', distance_meters: 42 }]);
  });
});
