import { createServerWake } from '@omni/shared/server-wake';

import { ApiError } from './ApiError';
import { toUrl } from './baseUrl';
import { API_KEYS } from './keys';

/**
 * Instancia mobile del cold start de la API: polling a `API_KEYS.health` contra la base de `EXPO_PUBLIC_API_URL`
 * y `ApiError` como error. La orquestación (single-flight, backoff, tope y reintento) vive en `@omni/shared/server-wake`.
 */
const serverWake = createServerWake({
  fetch: (url, init) => fetch(url, init),
  healthUrl: () => toUrl(API_KEYS.health),
  createError: (message, status) => new ApiError(message, status),
});

export const { fetchWithWake, ensureServerAwake, subscribeServerWake } = serverWake;
