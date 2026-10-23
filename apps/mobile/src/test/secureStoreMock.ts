/**
 * Doble en memoria de `expo-secure-store` para tests de `tokenStorage`, del client y de `AuthProvider`. Se carga con
 * `jest.mock('expo-secure-store', () => jest.requireActual('@/test/secureStoreMock'))`. `store` expone el contenido
 * para sembrar claves y verificar qué quedó guardado.
 */
export const store = new Map<string, string>();

export const getItemAsync = jest.fn(async (key: string) => store.get(key) ?? null);

export const setItemAsync = jest.fn(async (key: string, value: string) => {
  store.set(key, value);
});

export const deleteItemAsync = jest.fn(async (key: string) => {
  store.delete(key);
});
