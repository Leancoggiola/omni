import type { WikipediaHolidaysResponse } from '@omni/shared/holidays';

import { config } from '../config';

const REQUEST_TIMEOUT_MS = 8_000;

/** Traduce una falla de red o de lectura del body al error HTTP que expone la API. */
function upstreamError(err: unknown, fallbackMessage: string): { status: number; message: string } {
  if (err instanceof Error && err.name === 'TimeoutError') {
    return { status: 504, message: 'Wikipedia no respondió a tiempo' };
  }
  return { status: 502, message: fallbackMessage };
}

/**
 * Wikimedia lee `User-Agent` en server-to-server y `Api-User-Agent` cuando el request parece de navegador.
 * El `signal` cubre también la lectura del body: un timeout en `res.json()` se rechaza con el mismo
 * `TimeoutError`. Un 404 es un día sin celebraciones, no un error.
 */
export async function fetchHolidays(month: string, day: string): Promise<WikipediaHolidaysResponse> {
  const url = `${config.wikipedia.baseUrl}/feed/onthisday/holidays/${month}/${day}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': config.wikipedia.userAgent,
        'Api-User-Agent': config.wikipedia.userAgent,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw upstreamError(err, 'No se pudo contactar a Wikipedia');
  }

  if (res.status === 404) {
    return { holidays: [] };
  }
  if (!res.ok) {
    throw { status: 502, message: `Error de Wikipedia: ${res.statusText}` };
  }

  try {
    return (await res.json()) as WikipediaHolidaysResponse;
  } catch (err) {
    throw upstreamError(err, 'Wikipedia devolvió una respuesta inválida');
  }
}
