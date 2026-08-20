jest.mock('../../../src/di/container', () => ({
  container: {
    barRepository: { listVisibleBars: jest.fn() },
    tabRepository: { listAllForCurrentUser: jest.fn() },
  },
}));
jest.mock('../../../src/infrastructure/location/deviceLocation', () => ({
  deviceLocation: { getCurrentPosition: jest.fn() },
}));
jest.mock('../../../src/infrastructure/settings/nearbyRadiusSetting', () => ({
  nearbyRadiusSetting: { get: jest.fn() },
}));

import { container } from '../../../src/di/container';
import { deviceLocation } from '../../../src/infrastructure/location/deviceLocation';
import { nearbyRadiusSetting } from '../../../src/infrastructure/settings/nearbyRadiusSetting';
import { listBarsSortedByDistance } from '../../../src/application/bars/listBarsSortedByDistance';

const HERE = { latitude: 40, longitude: -3 };
// ~111m al norte de HERE, y ~11km al norte de HERE respectivamente (1º de
// latitud son ~111km).
const NEAR = { latitude: 40.001, longitude: -3 };
const FAR = { latitude: 40.1, longitude: -3 };

function bar(overrides) {
  return { id: 'id', name: 'Bar', latitude: null, longitude: null, ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
  nearbyRadiusSetting.get.mockResolvedValue(2); // 2km por defecto
  container.tabRepository.listAllForCurrentUser.mockResolvedValue([]);
});

describe('listBarsSortedByDistance', () => {
  it('ordena por cercanía cuando hay posición', async () => {
    deviceLocation.getCurrentPosition.mockResolvedValue(HERE);
    nearbyRadiusSetting.get.mockResolvedValue(20); // radio amplio: que no filtre a "Lejos", solo queremos probar el orden
    container.barRepository.listVisibleBars.mockResolvedValue([
      bar({ id: 'lejos', name: 'Lejos', ...FAR }),
      bar({ id: 'cerca', name: 'Cerca', ...NEAR }),
    ]);

    const result = await listBarsSortedByDistance();

    expect(result.map((b) => b.id)).toEqual(['cerca', 'lejos']);
  });

  it('filtra bares fuera del radio configurado', async () => {
    deviceLocation.getCurrentPosition.mockResolvedValue(HERE);
    nearbyRadiusSetting.get.mockResolvedValue(2); // 2km
    container.barRepository.listVisibleBars.mockResolvedValue([
      bar({ id: 'cerca', name: 'Cerca', ...NEAR }),
      bar({ id: 'lejos', name: 'Lejos', ...FAR }), // ~11km, fuera de radio
    ]);

    const result = await listBarsSortedByDistance();

    expect(result.map((b) => b.id)).toEqual(['cerca']);
  });

  it('nunca filtra los bares privados (sin coordenadas), aunque haya radio', async () => {
    deviceLocation.getCurrentPosition.mockResolvedValue(HERE);
    container.barRepository.listVisibleBars.mockResolvedValue([
      bar({ id: 'privado', latitude: null }),
    ]);

    const result = await listBarsSortedByDistance();

    expect(result.map((b) => b.id)).toEqual(['privado']);
  });

  it('no filtra nada si no hay posición (permiso denegado)', async () => {
    deviceLocation.getCurrentPosition.mockResolvedValue(null);
    container.barRepository.listVisibleBars.mockResolvedValue([bar({ id: 'lejos', ...FAR })]);

    const result = await listBarsSortedByDistance();

    expect(result.map((b) => b.id)).toEqual(['lejos']);
  });

  it('a igualdad de distancia, ordena por número de visitas (más primero)', async () => {
    deviceLocation.getCurrentPosition.mockResolvedValue(null); // sin posición: no desempata por distancia
    container.barRepository.listVisibleBars.mockResolvedValue([
      bar({ id: 'poco-visitado', name: 'Poco' }),
      bar({ id: 'muy-visitado', name: 'Mucho' }),
    ]);
    container.tabRepository.listAllForCurrentUser.mockResolvedValue([
      { barId: 'poco-visitado' },
      { barId: 'muy-visitado' },
      { barId: 'muy-visitado' },
    ]);

    const result = await listBarsSortedByDistance();

    expect(result.map((b) => b.id)).toEqual(['muy-visitado', 'poco-visitado']);
  });

  it('a igualdad de distancia y visitas, ordena alfabéticamente', async () => {
    deviceLocation.getCurrentPosition.mockResolvedValue(null);
    container.barRepository.listVisibleBars.mockResolvedValue([
      bar({ id: '2', name: 'Zeta' }),
      bar({ id: '1', name: 'Alfa' }),
    ]);

    const result = await listBarsSortedByDistance();

    expect(result.map((b) => b.name)).toEqual(['Alfa', 'Zeta']);
  });
});
