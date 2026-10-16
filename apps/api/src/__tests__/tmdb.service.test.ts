import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { config } from '../config';
import { getMovieDetail, searchMulti } from '../media/tmdb.service';

/** Lo único que sale a internet es el fetch global: se reemplaza por un mock en cada caso. */
const fetchMock = vi.fn<typeof fetch>();

function timeoutError(): DOMException {
  return new DOMException('The operation was aborted due to timeout', 'TimeoutError');
}

describe('tmdb.service', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('autentica con Bearer y no deja la credencial en la URL', async () => {
    fetchMock.mockResolvedValue(Response.json({ page: 1, results: [], total_pages: 0, total_results: 0 }));

    await searchMulti('fight', 2);

    const [url, init] = fetchMock.mock.calls[0]!;
    const parsed = new URL(String(url));
    expect(parsed.pathname).toMatch(/\/search\/multi$/);
    expect(parsed.searchParams.get('query')).toBe('fight');
    expect(parsed.searchParams.get('page')).toBe('2');
    expect(parsed.searchParams.has('api_key')).toBe(false);
    expect(String(url)).not.toContain(config.tmdb.apiKey);
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${config.tmdb.apiKey}` });
  });

  it('pide con un timeout de 8 segundos', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    fetchMock.mockResolvedValue(Response.json({ id: 550, title: 'Fight Club' }));

    await getMovieDetail(550);

    expect(timeoutSpy).toHaveBeenCalledWith(8000);
    expect(fetchMock.mock.calls[0]![1]?.signal).toBeInstanceOf(AbortSignal);
    timeoutSpy.mockRestore();
  });

  it('devuelve el JSON de TMDB', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 550, title: 'Fight Club' }));

    await expect(getMovieDetail(550)).resolves.toEqual({ id: 550, title: 'Fight Club' });
  });

  it('devuelve 504 cuando TMDB no responde a tiempo', async () => {
    fetchMock.mockRejectedValue(timeoutError());

    await expect(getMovieDetail(550)).rejects.toMatchObject({ status: 504 });
  });

  it('devuelve 504 cuando el timeout salta leyendo el body', async () => {
    const res = new Response('{}');
    vi.spyOn(res, 'json').mockRejectedValue(timeoutError());
    fetchMock.mockResolvedValue(res);

    await expect(getMovieDetail(550)).rejects.toMatchObject({ status: 504 });
  });

  it('devuelve 502 ante una falla de red', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(getMovieDetail(550)).rejects.toMatchObject({ status: 502 });
  });

  it.each([500, 502, 503, 504, 429, 400])('devuelve 502 cuando TMDB responde %i', async status => {
    fetchMock.mockResolvedValue(new Response('boom', { status }));

    await expect(getMovieDetail(550)).rejects.toMatchObject({ status: 502 });
  });

  it.each([401, 403])('no reenvía el %i de TMDB: lo devuelve como 502', async status => {
    fetchMock.mockResolvedValue(new Response('Invalid API key', { status, statusText: 'Unauthorized' }));

    const error = await getMovieDetail(550).catch((err: unknown) => err);

    expect(error).toMatchObject({ status: 502 });
    expect(JSON.stringify(error)).not.toContain('Invalid API key');
  });

  it('devuelve 502 cuando TMDB responde 200 con un body que no es JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>oops</html>', { status: 200 }));

    await expect(getMovieDetail(550)).rejects.toMatchObject({ status: 502 });
  });

  it('devuelve 404 cuando el título no existe en TMDB', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 404 }));

    await expect(getMovieDetail(1)).rejects.toMatchObject({ status: 404 });
  });
});
