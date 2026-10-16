import { useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { SWRConfig, type Cache, type State, type SWRConfiguration } from 'swr';

import { ApiError, fetcher } from '@/shared/api';

import type { FC, PropsWithChildren } from 'react';

/**
 * Un 4xx no se arregla reintentando (401 ya pasó por el refresh del client, 404 no va a aparecer). Un 408 y un 429
 * sí: son transitorios, y el 429 también llega cuando el que lo devuelve es el refresh (el client propaga su
 * `ApiError`). Es la única definición: la usan `SWR_RETRY_OPTIONS` (qué reintenta SWR, también en el hook de sesión)
 * y `AuthProvider` (un 4xx así manda al login; red, timeout, 5xx, 408 y 429 dejan la sesión sin verificar).
 */
export const isClientError = (err: unknown): boolean =>
  err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 408 && err.status !== 429;

export const SWR_RETRY_OPTIONS = {
  errorRetryCount: 3,
  shouldRetryOnError: (err: unknown) => !isClientError(err),
} satisfies SWRConfiguration;

/**
 * En React Native SWR no se entera de que la app volvió a primer plano: avisa con `AppState` cuando pasa de
 * `background`/`inactive` a `active`. Devuelve la función que desuscribe.
 */
export function initAppStateFocus(callback: () => void): () => void {
  let current: AppStateStatus = AppState.currentState;
  const subscription = AppState.addEventListener('change', next => {
    if (current !== 'active' && next === 'active') callback();
    current = next;
  });
  return () => subscription.remove();
}

const SWR_OPTIONS: SWRConfiguration = {
  fetcher,
  ...SWR_RETRY_OPTIONS,
  initFocus: initAppStateFocus,
};

const appStore = new Map<string, State>();

/**
 * Una caché nueva por montaje sobre el mismo `store`. SWR registra su estado interno por identidad de la caché: si
 * el árbol nuevo reusara el mismo objeto, se montaría mientras el viejo sigue registrado y al desmontarse el viejo
 * borraría el registro que el nuevo necesita.
 */
function cacheOver(store: Map<string, State>): Cache {
  return {
    keys: () => store.keys(),
    get: key => store.get(key),
    set: (key, value) => {
      store.set(key, value);
    },
    delete: key => {
      store.delete(key);
    },
  };
}

type SWRProviderProps = PropsWithChildren<{
  store?: Map<string, State>;
}>;

/**
 * Configuración global de SWR, montada por encima de `AuthProvider` para que la sesión y los datos compartan la
 * misma caché (`clearSession` la vacía entera). `initFocus` solo se aplica con `provider`: por eso la caché propia.
 * Los `useSWR` revalidan al volver a primer plano; los `useSWRImmutable` (sesión, perfil) no. Los datos viven en
 * `store`, fuera del componente (`appStore`; los tests pasan uno nuevo, y se toma solo al montar): expo-router
 * vuelve a montar el layout raíz al redirigir (del login a las tabs, al cerrar sesión) y una caché creada al montar
 * se perdería, la sesión incluida.
 */
export const SWRProvider: FC<SWRProviderProps> = ({ children, store = appStore }) => {
  const [value] = useState<SWRConfiguration>(() => ({ ...SWR_OPTIONS, provider: () => cacheOver(store) }));
  return <SWRConfig value={value}>{children}</SWRConfig>;
};
