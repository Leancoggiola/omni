import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'omni.session';
const LEGACY_ACCESS_KEY = 'omni.accessToken';
const LEGACY_REFRESH_KEY = 'omni.refreshToken';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

/** Un valor ausente, que no es JSON o que no tiene la forma esperada se trata como "sin sesión". */
function parseTokens(raw: string | null): StoredTokens | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredTokens> | null;
    if (typeof value?.accessToken === 'string' && typeof value.refreshToken === 'string') {
      return { accessToken: value.accessToken, refreshToken: value.refreshToken };
    }
  } catch {}
  return null;
}

let migration: Promise<void> | null = null;

/**
 * Pasa las dos claves anteriores (access y refresh por separado) a la clave única de sesión. Es idempotente:
 * una clave nueva válida nunca se pisa, y las claves viejas que sobren (incluso de una migración interrumpida
 * entre la escritura y el borrado) se eliminan. Si solo había una de las dos viejas no hay sesión que conservar.
 * Una vez escrita la clave nueva, que falle el borrado de las viejas no impide usar la sesión: es solo limpieza
 * y se reintenta en el próximo arranque. Un valor corrupto sin claves viejas con que reemplazarlo también se
 * descarta acá, antes de cualquier lectura o escritura, para que las lecturas sean puras.
 */
async function migrateLegacyKeys(): Promise<void> {
  const [raw, legacyAccess, legacyRefresh] = await Promise.all([
    SecureStore.getItemAsync(SESSION_KEY),
    SecureStore.getItemAsync(LEGACY_ACCESS_KEY),
    SecureStore.getItemAsync(LEGACY_REFRESH_KEY),
  ]);

  if (!parseTokens(raw) && legacyAccess && legacyRefresh) {
    const tokens: StoredTokens = { accessToken: legacyAccess, refreshToken: legacyRefresh };
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(tokens));
  }

  const hasCorruptSession = raw !== null && !parseTokens(raw) && !(legacyAccess && legacyRefresh);
  const leftovers = [
    legacyAccess !== null ? SecureStore.deleteItemAsync(LEGACY_ACCESS_KEY) : null,
    legacyRefresh !== null ? SecureStore.deleteItemAsync(LEGACY_REFRESH_KEY) : null,
    hasCorruptSession ? SecureStore.deleteItemAsync(SESSION_KEY) : null,
  ];
  await Promise.all(leftovers.map(pending => pending?.catch(() => undefined)));
}

/**
 * La migración corre una sola vez por proceso y toda lectura o escritura la espera, así una migración tardía
 * no puede pisar tokens recién rotados. Si falla se reintenta en el próximo acceso.
 */
function ensureMigrated(): Promise<void> {
  migration ??= migrateLegacyKeys().catch(error => {
    migration = null;
    throw error;
  });
  return migration;
}

/** Devuelve la sesión guardada o `null` si no hay (o si el valor guardado está corrupto). */
export async function getTokens(): Promise<StoredTokens | null> {
  await ensureMigrated();
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  return parseTokens(raw);
}

export async function getAccessToken(): Promise<string | null> {
  return (await getTokens())?.accessToken ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  return (await getTokens())?.refreshToken ?? null;
}

/** Guarda access y refresh en una sola clave: o quedan los dos nuevos o los dos anteriores. */
export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await ensureMigrated();
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ accessToken, refreshToken }));
}

export async function clearTokens(): Promise<void> {
  await ensureMigrated();
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
