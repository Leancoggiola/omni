import { clearRememberedUser, getRememberedUser, setRememberedUser } from './rememberedUser';

jest.mock('expo-secure-store', () => jest.requireActual('@/test/secureStoreMock'));

const secure = jest.requireMock<typeof import('@/test/secureStoreMock')>('expo-secure-store');

beforeEach(() => {
  secure.store.clear();
  jest.clearAllMocks();
});

describe('rememberedUser', () => {
  it('devuelve null sin usuario guardado', async () => {
    expect(await getRememberedUser()).toBeNull();
  });

  it('guarda solo el nombre de usuario, en una clave aparte de la sesión', async () => {
    await setRememberedUser('admin01');

    expect(await getRememberedUser()).toBe('admin01');
    expect([...secure.store.entries()]).toEqual([['omni.rememberedUser', 'admin01']]);
  });

  it('clearRememberedUser lo olvida', async () => {
    await setRememberedUser('admin01');
    await clearRememberedUser();

    expect(await getRememberedUser()).toBeNull();
    expect(secure.store.size).toBe(0);
  });

  it('no deja de funcionar si SecureStore falla', async () => {
    secure.getItemAsync.mockRejectedValueOnce(new Error('boom'));
    secure.setItemAsync.mockRejectedValueOnce(new Error('boom'));
    secure.deleteItemAsync.mockRejectedValueOnce(new Error('boom'));

    expect(await getRememberedUser()).toBeNull();
    await expect(setRememberedUser('admin01')).resolves.toBeUndefined();
    await expect(clearRememberedUser()).resolves.toBeUndefined();
  });
});
