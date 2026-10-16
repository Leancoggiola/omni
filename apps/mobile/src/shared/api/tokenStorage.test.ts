const SESSION_KEY = 'omni.session';
const LEGACY_ACCESS_KEY = 'omni.accessToken';
const LEGACY_REFRESH_KEY = 'omni.refreshToken';

jest.mock('expo-secure-store', () => jest.requireActual('@/test/secureStoreMock'));

type Storage = typeof import('./tokenStorage');
type SecureStoreMock = typeof import('@/test/secureStoreMock');

describe('tokenStorage', () => {
  let storage: Storage;
  let secure: SecureStoreMock;

  const load = () => {
    jest.resetModules();
    storage = jest.requireActual<Storage>('./tokenStorage');
    secure = jest.requireMock<SecureStoreMock>('expo-secure-store');
  };

  beforeEach(load);

  describe('sesión en una sola clave', () => {
    it('guarda access y refresh en una única escritura', async () => {
      await storage.setTokens('access-1', 'refresh-1');

      expect(secure.setItemAsync).toHaveBeenCalledTimes(1);
      expect([...secure.store.keys()]).toEqual([SESSION_KEY]);
      expect(JSON.parse(secure.store.get(SESSION_KEY)!)).toEqual({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      });
    });

    it('devuelve los tokens guardados', async () => {
      await storage.setTokens('access-1', 'refresh-1');

      expect(await storage.getTokens()).toEqual({ accessToken: 'access-1', refreshToken: 'refresh-1' });
      expect(await storage.getAccessToken()).toBe('access-1');
      expect(await storage.getRefreshToken()).toBe('refresh-1');
    });

    it('devuelve null sin sesión', async () => {
      expect(await storage.getTokens()).toBeNull();
      expect(await storage.getAccessToken()).toBeNull();
      expect(await storage.getRefreshToken()).toBeNull();
    });

    it('reemplaza la sesión anterior al guardar un par nuevo', async () => {
      await storage.setTokens('access-1', 'refresh-1');
      await storage.setTokens('access-2', 'refresh-2');

      expect(await storage.getTokens()).toEqual({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    });

    it('clearTokens borra la sesión', async () => {
      await storage.setTokens('access-1', 'refresh-1');
      await storage.clearTokens();

      expect(secure.store.size).toBe(0);
      expect(await storage.getTokens()).toBeNull();
    });

    it.each([
      ['no es JSON', 'not-json'],
      ['tiene otra forma', JSON.stringify({ accessToken: 'solo-access' })],
    ])('descarta un valor guardado que %s', async (_case, raw) => {
      secure.store.set(SESSION_KEY, raw);

      expect(await storage.getTokens()).toBeNull();
      expect(secure.store.has(SESSION_KEY)).toBe(false);
    });
  });

  it('si falla el borrado de un valor corrupto igual lo trata como sin sesión', async () => {
    secure.store.set(SESSION_KEY, 'not-json');
    secure.deleteItemAsync.mockRejectedValueOnce(new Error('keystore no disponible'));

    await expect(storage.getTokens()).resolves.toBeNull();
  });

  describe('migración de las claves anteriores', () => {
    const seedLegacy = () => {
      secure.store.set(LEGACY_ACCESS_KEY, 'legacy-access');
      secure.store.set(LEGACY_REFRESH_KEY, 'legacy-refresh');
    };

    it('conserva la sesión de quien ya estaba logueado', async () => {
      seedLegacy();

      expect(await storage.getTokens()).toEqual({ accessToken: 'legacy-access', refreshToken: 'legacy-refresh' });
    });

    it('borra las claves anteriores y deja solo la sesión nueva', async () => {
      seedLegacy();
      await storage.getTokens();

      expect([...secure.store.keys()]).toEqual([SESSION_KEY]);
    });

    it('es idempotente: migrar de nuevo no cambia nada', async () => {
      seedLegacy();
      await storage.getTokens();
      const snapshot = new Map(secure.store);

      load();
      secure.store.clear();
      snapshot.forEach((value, key) => secure.store.set(key, value));

      secure.setItemAsync.mockClear();
      secure.deleteItemAsync.mockClear();

      expect(await storage.getTokens()).toEqual({ accessToken: 'legacy-access', refreshToken: 'legacy-refresh' });
      expect(secure.store).toEqual(snapshot);
      expect(secure.setItemAsync).not.toHaveBeenCalled();
      expect(secure.deleteItemAsync).not.toHaveBeenCalled();
    });

    it('termina una migración interrumpida entre la escritura y el borrado', async () => {
      seedLegacy();
      secure.store.set(SESSION_KEY, JSON.stringify({ accessToken: 'legacy-access', refreshToken: 'legacy-refresh' }));

      expect(await storage.getTokens()).toEqual({ accessToken: 'legacy-access', refreshToken: 'legacy-refresh' });
      expect([...secure.store.keys()]).toEqual([SESSION_KEY]);
    });

    it('no pisa una sesión nueva válida con las claves anteriores', async () => {
      seedLegacy();
      secure.store.set(SESSION_KEY, JSON.stringify({ accessToken: 'new-access', refreshToken: 'new-refresh' }));

      expect(await storage.getTokens()).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
      expect([...secure.store.keys()]).toEqual([SESSION_KEY]);
    });

    it('reemplaza una sesión nueva corrupta por la de las claves anteriores', async () => {
      seedLegacy();
      secure.store.set(SESSION_KEY, 'not-json');

      expect(await storage.getTokens()).toEqual({ accessToken: 'legacy-access', refreshToken: 'legacy-refresh' });
    });

    it.each([[LEGACY_ACCESS_KEY], [LEGACY_REFRESH_KEY]])('limpia el estado parcial con solo %s', async key => {
      secure.store.set(key, 'solo-uno');

      expect(await storage.getTokens()).toBeNull();
      expect(secure.store.size).toBe(0);
    });

    it('migra una sola vez ante lecturas concurrentes', async () => {
      seedLegacy();

      const results = await Promise.all([storage.getTokens(), storage.getAccessToken(), storage.getRefreshToken()]);

      expect(results).toEqual([
        { accessToken: 'legacy-access', refreshToken: 'legacy-refresh' },
        'legacy-access',
        'legacy-refresh',
      ]);
      expect(secure.setItemAsync).toHaveBeenCalledTimes(1);
    });

    it('un setTokens inmediato no se pierde por una migración pendiente', async () => {
      seedLegacy();

      await Promise.all([storage.getTokens(), storage.setTokens('rotated-access', 'rotated-refresh')]);

      expect(await storage.getTokens()).toEqual({ accessToken: 'rotated-access', refreshToken: 'rotated-refresh' });
    });

    it('si falla la escritura de la sesión nueva conserva las claves anteriores y reintenta después', async () => {
      seedLegacy();
      secure.setItemAsync.mockRejectedValueOnce(new Error('keystore lleno'));

      await expect(storage.getTokens()).rejects.toThrow('keystore lleno');
      expect(secure.store.has(LEGACY_ACCESS_KEY)).toBe(true);
      expect(secure.store.has(LEGACY_REFRESH_KEY)).toBe(true);
      expect(await storage.getTokens()).toEqual({ accessToken: 'legacy-access', refreshToken: 'legacy-refresh' });
    });

    it('si falla el borrado de las claves anteriores la sesión nueva igual se puede usar', async () => {
      seedLegacy();
      secure.deleteItemAsync.mockRejectedValue(new Error('no se pudo borrar'));

      await expect(storage.getTokens()).resolves.toEqual({
        accessToken: 'legacy-access',
        refreshToken: 'legacy-refresh',
      });
      expect(secure.store.has(SESSION_KEY)).toBe(true);
    });

    it('reintenta la migración si falló la primera vez', async () => {
      seedLegacy();
      secure.getItemAsync.mockRejectedValueOnce(new Error('keystore no disponible'));

      await expect(storage.getTokens()).rejects.toThrow('keystore no disponible');
      expect(await storage.getTokens()).toEqual({ accessToken: 'legacy-access', refreshToken: 'legacy-refresh' });
    });
  });
});
