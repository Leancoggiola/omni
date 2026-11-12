import { getBiometricEnabled, setBiometricEnabled } from './biometricPreference';

jest.mock('expo-secure-store', () => jest.requireActual('@/test/secureStoreMock'));

const secure = jest.requireMock<typeof import('@/test/secureStoreMock')>('expo-secure-store');

beforeEach(() => {
  secure.store.clear();
  jest.clearAllMocks();
});

describe('biometricPreference', () => {
  it('por defecto la biometría está desactivada', async () => {
    expect(await getBiometricEnabled()).toBe(false);
  });

  it('al activarla guarda una clave aparte de la sesión y del usuario recordado', async () => {
    await setBiometricEnabled(true);

    expect(await getBiometricEnabled()).toBe(true);
    expect([...secure.store.entries()]).toEqual([['omni.biometricEnabled', '1']]);
  });

  it('al desactivarla borra la clave', async () => {
    await setBiometricEnabled(true);
    await setBiometricEnabled(false);

    expect(await getBiometricEnabled()).toBe(false);
    expect(secure.store.size).toBe(0);
  });

  it('un valor distinto del esperado cuenta como desactivada', async () => {
    secure.store.set('omni.biometricEnabled', 'true');

    expect(await getBiometricEnabled()).toBe(false);
  });

  it('leer nunca falla: si SecureStore falla, queda desactivada', async () => {
    secure.getItemAsync.mockRejectedValueOnce(new Error('boom'));

    expect(await getBiometricEnabled()).toBe(false);
  });

  it('escribir propaga el fallo para que el toggle avise', async () => {
    secure.setItemAsync.mockRejectedValueOnce(new Error('boom'));

    await expect(setBiometricEnabled(true)).rejects.toThrow('boom');
  });
});
