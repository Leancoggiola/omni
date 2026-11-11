import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { config } from '../config';
import { fetchProduct, resetOpenFoodFactsLimiter } from '../pantry/open-food-facts.service';

const fetchMock = vi.fn<typeof fetch>();
const BARCODE = '7790895000997';

const UNAVAILABLE = { status: 502, message: 'No se pudo consultar el catálogo de productos' };
const BUSY = { status: 503, message: 'Hay muchas consultas al catálogo de productos, probá de nuevo en un minuto' };

function found(product: Record<string, unknown> = {}) {
  return {
    code: BARCODE,
    status: 1,
    status_verbose: 'product found',
    product: {
      product_name: 'Coca-Cola',
      product_name_es: 'Coca Cola Original',
      brands: 'Coca-Cola',
      quantity: '2,25 L',
      categories_tags: ['en:beverages', 'en:carbonated-drinks', 'en:sodas'],
      ...product,
    },
  };
}

describe('fetchProduct', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    resetOpenFoodFactsLimiter();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('pide el producto con los campos justos, el User-Agent de la app y un tope de tiempo', async () => {
    fetchMock.mockResolvedValue(Response.json(found()));

    await fetchProduct(BARCODE, 'ana');

    const [input, init] = fetchMock.mock.calls[0] ?? [];
    const url = new URL(String(input));
    expect(`${url.origin}${url.pathname}`).toBe(`${config.openFoodFacts.baseUrl}/product/${BARCODE}.json`);
    expect(url.searchParams.get('fields')).toBe('code,product_name,product_name_es,brands,quantity,categories_tags');
    expect(init?.headers).toEqual({ 'User-Agent': config.openFoodFacts.userAgent, Accept: 'application/json' });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each(['0012345678905', '00000000', '96385074'])('conserva los ceros y los dígitos de %s en la URL', async code => {
    fetchMock.mockResolvedValue(Response.json(found()));

    await fetchProduct(code, 'ana');

    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).pathname).toMatch(new RegExp(`/product/${code}\\.json$`));
  });

  it.each(['../../admin', '7790895000997?x=1', '012345678905', '', '7790895000997 '])(
    'rechaza %j con 400 sin salir a la red ni gastar cupo',
    async code => {
      await expect(fetchProduct(code, 'ana')).rejects.toMatchObject({
        status: 400,
        message: 'El código de barras no es válido',
      });
      expect(fetchMock).not.toHaveBeenCalled();

      fetchMock.mockImplementation(async () => Response.json(found()));
      for (let i = 0; i < 8; i += 1) await fetchProduct(BARCODE, 'ana');
      expect(fetchMock).toHaveBeenCalledTimes(8);
    }
  );

  it('devuelve el producto con el nombre en castellano', async () => {
    fetchMock.mockResolvedValue(Response.json(found()));

    await expect(fetchProduct(BARCODE, 'ana')).resolves.toEqual({
      name: 'Coca Cola Original',
      brand: 'Coca-Cola',
      packageSize: '2,25 L',
      category: 'BEVERAGES',
    });
  });

  it('cae al nombre genérico si no hay nombre en castellano', async () => {
    fetchMock.mockResolvedValue(Response.json(found({ product_name_es: '' })));

    await expect(fetchProduct(BARCODE, 'ana')).resolves.toMatchObject({ name: 'Coca-Cola' });
  });

  it('acepta el status como texto y tolera campos con un tipo inesperado', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ ...found({ quantity: 500, brands: null, categories_tags: 'en:sodas' }), status: '1' })
    );

    await expect(fetchProduct(BARCODE, 'ana')).resolves.toEqual({
      name: 'Coca Cola Original',
      brand: null,
      packageSize: null,
      category: null,
    });
  });

  it.each([
    [
      'responde 404 con JSON',
      () => Response.json({ code: BARCODE, status: 0, status_verbose: 'product not found' }, { status: 404 }),
    ],
    ['responde 200 con status 0', () => Response.json({ code: BARCODE, status: 0 })],
    ['responde 200 con status "0"', () => Response.json({ code: BARCODE, status: '0' })],
    ['tiene el producto sin nombre', () => Response.json(found({ product_name: '', product_name_es: null }))],
  ])('devuelve null cuando el catálogo %s', async (_case, buildResponse) => {
    fetchMock.mockResolvedValue(buildResponse());

    await expect(fetchProduct(BARCODE, 'ana')).resolves.toBeNull();
  });

  it('devuelve 504 cuando el request vence', async () => {
    fetchMock.mockRejectedValue(new DOMException('timeout', 'TimeoutError'));

    await expect(fetchProduct(BARCODE, 'ana')).rejects.toMatchObject({
      status: 504,
      message: 'El catálogo de productos tardó demasiado en responder',
    });
  });

  it('devuelve 504 cuando el body vence a mitad de la lectura', async () => {
    const res = new Response('{}', { status: 200 });
    vi.spyOn(res, 'json').mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    fetchMock.mockResolvedValue(res);

    await expect(fetchProduct(BARCODE, 'ana')).rejects.toMatchObject({ status: 504 });
  });

  it('devuelve 502 cuando no se puede contactar al catálogo', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(fetchProduct(BARCODE, 'ana')).rejects.toMatchObject(UNAVAILABLE);
  });

  it.each([
    ['responde 500', () => new Response('boom', { status: 500 })],
    ['responde 403', () => new Response('forbidden', { status: 403 })],
    ['responde 404 sin JSON', () => new Response('<html>Not found</html>', { status: 404 })],
    ['responde 404 con un JSON sin status', () => Response.json({ error: 'Not Found' }, { status: 404 })],
    ['responde 404 con status 1', () => Response.json({ code: BARCODE, status: 1 }, { status: 404 })],
    ['responde 200 con el status vacío', () => Response.json({ code: BARCODE, status: '' })],
    ['trae el nombre con un tipo inesperado', () => Response.json(found({ product_name_es: { es: 'Coca Cola' } }))],
    ['responde 200 con HTML', () => new Response('<html></html>', { status: 200 })],
    ['responde un JSON que no es un objeto', () => Response.json(['nope'])],
    ['responde 200 sin producto ni status', () => Response.json({ code: BARCODE })],
    ['responde status 1 sin producto', () => Response.json({ code: BARCODE, status: 1 })],
  ])('devuelve 502 cuando el catálogo %s', async (_case, buildResponse) => {
    fetchMock.mockResolvedValue(buildResponse());

    await expect(fetchProduct(BARCODE, 'ana')).rejects.toMatchObject(UNAVAILABLE);
  });

  it('devuelve 503 cuando el catálogo responde 429', async () => {
    fetchMock.mockResolvedValue(new Response('Too many requests', { status: 429 }));

    await expect(fetchProduct(BARCODE, 'ana')).rejects.toMatchObject(BUSY);
  });

  it('corta en la consulta 11 del minuto sin salir a la red', async () => {
    fetchMock.mockImplementation(async () => Response.json(found()));

    for (let i = 0; i < 10; i += 1) await fetchProduct(BARCODE, i % 2 ? 'ana' : 'beto');

    await expect(fetchProduct(BARCODE, 'ana')).rejects.toMatchObject(BUSY);
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it('corta en la consulta 9 del minuto de una misma persona y le deja cupo al resto', async () => {
    fetchMock.mockImplementation(async () => Response.json(found()));

    for (let i = 0; i < 8; i += 1) await fetchProduct(BARCODE, 'ana');

    await expect(fetchProduct(BARCODE, 'ana')).rejects.toMatchObject(BUSY);
    await expect(fetchProduct(BARCODE, 'beto')).resolves.toMatchObject({ name: 'Coca Cola Original' });
    expect(fetchMock).toHaveBeenCalledTimes(9);
  });

  it('las consultas que fallan también gastan cupo', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    for (let i = 0; i < 10; i += 1)
      await expect(fetchProduct(BARCODE, i % 2 ? 'ana' : 'beto')).rejects.toMatchObject(UNAVAILABLE);

    await expect(fetchProduct(BARCODE, 'ana')).rejects.toMatchObject(BUSY);
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it('vuelve a tener cupo cuando pasa el minuto', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-11T12:00:00.000Z'));
    fetchMock.mockImplementation(async () => Response.json(found()));
    for (let i = 0; i < 10; i += 1) await fetchProduct(BARCODE, i % 2 ? 'ana' : 'beto');
    await expect(fetchProduct(BARCODE, 'ana')).rejects.toMatchObject(BUSY);

    vi.setSystemTime(new Date('2026-11-11T12:01:00.001Z'));

    await expect(fetchProduct(BARCODE, 'ana')).resolves.toMatchObject({ name: 'Coca Cola Original' });
  });
});
