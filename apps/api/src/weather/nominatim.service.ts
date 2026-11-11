import { z } from 'zod';

import type { WeatherCoordinates } from '@omni/shared/weather';

import { logger } from '../common/utils';
import { config } from '../config';

const REQUEST_TIMEOUT_MS = 3_000;
const MIN_INTERVAL_MS = 1_000;

let nextSlotAt = 0;

const reverseResponseSchema = z.object({
  address: z.object({
    city: z.string().min(1).optional(),
    town: z.string().min(1).optional(),
    village: z.string().min(1).optional(),
    municipality: z.string().min(1).optional(),
  }),
});

/** Reserva el turno global de Nominatim, cuya política admite como máximo una consulta por segundo. */
function reserveSlot(): boolean {
  const now = Date.now();
  if (now < nextSlotAt) return false;
  nextSlotAt = now + MIN_INTERVAL_MS;
  return true;
}

/**
 * Pide a Nominatim el nombre de la localidad de unas coordenadas. El nombre es secundario frente al clima, así que
 * nunca rechaza: si falla, no hay turno libre o el punto no tiene localidad devuelve `null`, y se reintenta al
 * refrescar. El log no incluye el error ni las coordenadas, para no dejar la ubicación escrita. La política de
 * Nominatim exige un `User-Agent` identificable.
 */
export async function fetchCityName({ latitude, longitude }: WeatherCoordinates): Promise<string | null> {
  if (!reserveSlot()) return null;

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

/** Solo para tests: el turno es estado de módulo y sobrevive entre casos. */
export function resetNominatimSlot(): void {
  nextSlotAt = 0;
}
