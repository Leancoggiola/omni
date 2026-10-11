import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchHolidays } from '../holidays/wikipedia.service';

/** Lo único que sale a internet es el fetch global: se reemplaza por un mock en cada caso. */
const fetchMock = vi.fn<typeof fetch>();

function timeoutError(): DOMException {
  return new DOMException('The operation was aborted due to timeout', 'TimeoutError');
}

describe('wikipedia.service', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pide el feed de la fecha y devuelve el JSON', async () => {
    const body = { holidays: [{ text: 'Día del Bibliotecario' }] };
    fetchMock.mockResolvedValue(Response.json(body));

    await expect(fetchHolidays('09', '13')).resolves.toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/feed\/onthisday\/holidays\/09\/13$/),
      expect.objectContaining({ headers: expect.objectContaining({ 'User-Agent': expect.any(String) }) })
    );
  });

  it('trata el 404 como un día sin efemérides', async () => {
    fetchMock.mockResolvedValue(new Response('Not found', { status: 404 }));

    await expect(fetchHolidays('02', '30')).resolves.toEqual({ holidays: [] });
  });

  it('devuelve 502 cuando Wikipedia responde con error', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 503, statusText: 'Service Unavailable' }));

    await expect(fetchHolidays('09', '13')).rejects.toEqual({
      status: 502,
      message: 'Error de Wikipedia: Service Unavailable',
    });
  });

  it('devuelve 502 cuando no se puede contactar a Wikipedia', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(fetchHolidays('09', '13')).rejects.toEqual({
      status: 502,
      message: 'No se pudo contactar a Wikipedia',
    });
  });

  it('devuelve 504 cuando el request vence', async () => {
    fetchMock.mockRejectedValue(timeoutError());

    await expect(fetchHolidays('09', '13')).rejects.toEqual({
      status: 504,
      message: 'Wikipedia no respondió a tiempo',
    });
  });

  it('devuelve 502 cuando el body no es JSON válido', async () => {
    fetchMock.mockResolvedValue(new Response('<html>no es json</html>', { status: 200 }));

    await expect(fetchHolidays('09', '13')).rejects.toEqual({
      status: 502,
      message: 'Wikipedia devolvió una respuesta inválida',
    });
  });

  it('devuelve 504 cuando el timeout vence leyendo el body', async () => {
    const res = new Response('{}', { status: 200 });
    vi.spyOn(res, 'json').mockRejectedValue(timeoutError());
    fetchMock.mockResolvedValue(res);

    await expect(fetchHolidays('09', '13')).rejects.toEqual({
      status: 504,
      message: 'Wikipedia no respondió a tiempo',
    });
  });
});
