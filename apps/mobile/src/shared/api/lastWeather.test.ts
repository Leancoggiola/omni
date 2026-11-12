import { clearLastWeather, readLastWeather, saveLastWeather } from './lastWeather';

import type { CurrentWeather } from '@omni/shared/weather';

jest.mock('expo-secure-store', () => jest.requireActual('@/test/secureStoreMock'));

const secure = jest.requireMock<typeof import('@/test/secureStoreMock')>('expo-secure-store');

const WEATHER: CurrentWeather = {
  city: 'Rosario',
  temperature: 20,
  condition: 'clear',
  isDay: true,
  min: 12,
  max: 24,
  updatedAt: '2026-11-08T15:00:00.000Z',
  stale: false,
};

beforeEach(() => {
  secure.store.clear();
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }).setSystemTime(new Date('2026-11-08T16:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('lastWeather', () => {
  it('devuelve lo guardado como stale', async () => {
    await saveLastWeather('maria', WEATHER);
    expect(await readLastWeather('maria')).toEqual({ ...WEATHER, stale: true });
  });

  it('guarda por persona', async () => {
    await saveLastWeather('maria', WEATHER);
    expect(await readLastWeather('juan')).toBeNull();
  });

  it('descarta un dato que ya no sirve', async () => {
    await saveLastWeather('maria', WEATHER);
    jest.setSystemTime(new Date('2026-11-08T19:30:00.000Z'));
    expect(await readLastWeather('maria')).toBeNull();
  });

  it('clearLastWeather borra solo el de esa persona', async () => {
    await saveLastWeather('maria', WEATHER);
    await saveLastWeather('juan', WEATHER);
    await clearLastWeather('maria');
    expect(await readLastWeather('maria')).toBeNull();
    expect(await readLastWeather('juan')).not.toBeNull();
  });

  it('si SecureStore falla al borrar no lanza', async () => {
    secure.deleteItemAsync.mockRejectedValueOnce(new Error('boom'));
    await expect(clearLastWeather('maria')).resolves.toBeUndefined();
  });

  it('si SecureStore falla no lanza', async () => {
    secure.getItemAsync.mockRejectedValueOnce(new Error('boom'));
    secure.setItemAsync.mockRejectedValueOnce(new Error('boom'));
    expect(await readLastWeather('maria')).toBeNull();
    await expect(saveLastWeather('maria', WEATHER)).resolves.toBeUndefined();
  });
});
