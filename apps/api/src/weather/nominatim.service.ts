import { z } from 'zod';

import type { WeatherCoordinates } from '@omni/shared/weather';

import { logger } from '../common/utils';
import { config } from '../config';

const REQUEST_TIMEOUT_MS = 3_000;

const reverseResponseSchema = z.object({
  address: z.object({
    city: z.string().min(1).optional(),
    town: z.string().min(1).optional(),
    village: z.string().min(1).optional(),
    municipality: z.string().min(1).optional(),
  }),
});

/**
 * Pide a Nominatim el nombre de la localidad de unas coordenadas. El nombre es secundario frente al clima, así que
 * nunca rechaza: si falla o el punto no tiene localidad (mar abierto) devuelve `null`. El log no incluye el error ni
 * las coordenadas, para no dejar la ubicación escrita. La política de Nominatim exige un `User-Agent` identificable.
 */
export async function fetchCityName({ latitude, longitude }: WeatherCoordinates): Promise<string | null> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
    zoom: '10',
    'accept-language': 'es',
  });

  try {
    const res = await fetch(`${config.nominatim.baseUrl}/reverse?${params}`, {
      headers: { 'User-Agent': config.nominatim.userAgent, Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, 'Nominatim respondió con error');
      return null;
    }
    const parsed = reverseResponseSchema.safeParse(await res.json());
    if (!parsed.success) return null;
    const { city, town, village, municipality } = parsed.data.address;
    return city ?? town ?? village ?? municipality ?? null;
  } catch {
    logger.warn('No se pudo consultar a Nominatim');
    return null;
  }
}
