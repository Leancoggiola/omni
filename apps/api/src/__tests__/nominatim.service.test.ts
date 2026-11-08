import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchCityName } from '../weather/nominatim.service';

const fetchMock = vi.fn<typeof fetch>();
const COORDINATES = { latitude: -34.61, longitude: -58.38 };

describe('fetchCityName', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pide la localidad en español con un User-Agent identificable', async () => {
    fetchMock.mockResolvedValue(Response.json({ address: { city: 'Buenos Aires' } }));

    await expect(fetchCityName(COORDINATES)).resolves.toBe('Buenos Aires');

    const [input, init] = fetchMock.mock.calls[0] ?? [];
    const url = new URL(String(input));
    expect(url.pathname).toBe('/reverse');
    expect(url.searchParams.get('lat')).toBe('-34.61');
    expect(url.searchParams.get('lon')).toBe('-58.38');
    expect(url.searchParams.get('accept-language')).toBe('es');
    expect(init?.headers).toMatchObject({ 'User-Agent': expect.stringContaining('Omni') });
  });

  it.each([
    [{ town: 'Tandil', municipality: 'Partido de Tandil' }, 'Tandil'],
    [{ village: 'Purmamarca', municipality: 'Municipio' }, 'Purmamarca'],
    [{ municipality: 'Municipio de Rosario' }, 'Municipio de Rosario'],
  ])('elige la localidad más específica de %o', async (address, expected) => {
    fetchMock.mockResolvedValue(Response.json({ address }));

    await expect(fetchCityName(COORDINATES)).resolves.toBe(expected);
  });

  it.each([
    ['el punto no tiene localidad', () => Response.json({ error: 'Unable to geocode' })],
    ['la dirección no tiene ciudad', () => Response.json({ address: { country: 'Argentina' } })],
    ['responde con error', () => new Response('boom', { status: 429 })],
    ['el body no es JSON', () => new Response('<html></html>', { status: 200 })],
  ])('devuelve null cuando %s', async (_case, buildResponse) => {
    fetchMock.mockResolvedValue(buildResponse());

    await expect(fetchCityName(COORDINATES)).resolves.toBeNull();
  });

  it('devuelve null si no se puede contactar al servicio', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(fetchCityName(COORDINATES)).resolves.toBeNull();
  });
});
