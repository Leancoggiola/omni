import type { WikipediaHolidaysResponse } from '@omni/shared/holidays';

import { config } from '../config';

const REQUEST_TIMEOUT_MS = 8_000;

export async function fetchHolidays(month: string, day: string): Promise<WikipediaHolidaysResponse> {
  const url = `${config.wikipedia.baseUrl}/feed/onthisday/holidays/${month}/${day}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        // Wikimedia lee User-Agent en server-to-server y Api-User-Agent cuando el request parece de navegador.
        'User-Agent': config.wikipedia.userAgent,
        'Api-User-Agent': config.wikipedia.userAgent,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw { status: 504, message: 'Wikipedia no respondió a tiempo' };
    }
    throw { status: 502, message: 'No se pudo contactar a Wikipedia' };
  }

  if (res.status === 404) {
    throw { status: 404, message: 'No hay efemérides para esta fecha' };
  }
  if (!res.ok) {
    throw { status: 502, message: `Error de Wikipedia: ${res.statusText}` };
  }

  return res.json() as Promise<WikipediaHolidaysResponse>;
}
