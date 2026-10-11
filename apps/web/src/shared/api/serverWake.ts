import { ApiError } from './ApiError';
import { SWR_KEYS } from './keys';

import { createServerWake } from '@omni/shared/server-wake';

/**
 * Instancia web del cold start de la API: polling a `SWR_KEYS.health` sin caché y `ApiError` como error.
 * La orquestación (single-flight, backoff, tope y reintento) vive en `@omni/shared/server-wake`.
 */
const serverWake = createServerWake({
  fetch: (url, init) => fetch(url, init),
  healthUrl: SWR_KEYS.health,
  probeInit: { cache: 'no-store' },
  createError: (message, status) => new ApiError(message, status),
});

export const { fetchWithWake, ensureServerAwake, subscribeServerWake } = serverWake;
