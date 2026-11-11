import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  pantryProduct: { findUnique: vi.fn() },
  barcodeCatalogEntry: { findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
}));

vi.mock('../common/db', () => ({ prisma: db }));
vi.mock('../household/household.service', () => ({
  getHouseholdId: vi.fn(async () => 'hh1'),
  withHousehold: vi.fn(),
}));
vi.mock('../pantry/open-food-facts.service');

import { lookupBarcode } from '../pantry/barcode.service';
import { fetchProduct } from '../pantry/open-food-facts.service';

const mockedFetchProduct = vi.mocked(fetchProduct);
const BARCODE = '7790895000997';
const OTHER_BARCODE = '7622210449283';
const catalogProduct = { name: 'Coca Cola Original', brand: 'Coca-Cola', packageSize: '2,25 L', category: null };

/** Deja correr las promesas ya encoladas, para que las consultas en curso lleguen hasta la salida a la red. */
function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

describe('lookupBarcode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.pantryProduct.findUnique.mockResolvedValue(null);
    db.barcodeCatalogEntry.findUnique.mockResolvedValue(null);
    db.barcodeCatalogEntry.upsert.mockResolvedValue({});
    db.barcodeCatalogEntry.deleteMany.mockResolvedValue({ count: 0 });
    db.barcodeCatalogEntry.updateMany.mockResolvedValue({ count: 1 });
  });

  it('las consultas simultáneas al mismo código comparten una sola salida a la red', async () => {
    let release: (product: typeof catalogProduct) => void = () => {};
    mockedFetchProduct.mockImplementation(
      () =>
        new Promise(resolve => {
          release = resolve;
        })
    );

    const lookups = [lookupBarcode('ana', BARCODE), lookupBarcode('beto', BARCODE), lookupBarcode('ana', BARCODE)];
    await flushPromises();
    release(catalogProduct);
    const results = await Promise.all(lookups);

    expect(mockedFetchProduct).toHaveBeenCalledTimes(1);
    expect(mockedFetchProduct).toHaveBeenCalledWith(BARCODE, 'ana');
    expect(db.barcodeCatalogEntry.upsert).toHaveBeenCalledTimes(1);
    expect(results.map(result => result.status)).toEqual(['FOUND', 'FOUND', 'FOUND']);
  });

  it('las consultas simultáneas a códigos distintos salen por separado', async () => {
    mockedFetchProduct.mockResolvedValue(catalogProduct);

    await Promise.all([lookupBarcode('ana', BARCODE), lookupBarcode('ana', OTHER_BARCODE)]);

    expect(mockedFetchProduct).toHaveBeenCalledTimes(2);
  });

  it('una falla compartida llega a todas las consultas y no bloquea la siguiente', async () => {
    mockedFetchProduct.mockRejectedValueOnce({ status: 502, message: 'No se pudo consultar el catálogo' });

    const results = await Promise.allSettled([lookupBarcode('ana', BARCODE), lookupBarcode('beto', BARCODE)]);
    mockedFetchProduct.mockResolvedValue(catalogProduct);
    const retry = await lookupBarcode('ana', BARCODE);

    expect(results.map(result => result.status)).toEqual(['rejected', 'rejected']);
    expect(db.barcodeCatalogEntry.upsert).toHaveBeenCalledTimes(1);
    expect(retry.status).toBe('FOUND');
  });

  it('responde igual aunque no se pueda guardar el caché', async () => {
    mockedFetchProduct.mockResolvedValue(catalogProduct);
    db.barcodeCatalogEntry.upsert.mockRejectedValue(new Error('connection lost'));

    await expect(lookupBarcode('ana', BARCODE)).resolves.toMatchObject({
      status: 'FOUND',
      suggestion: { name: 'Coca Cola Original 2,25 L' },
    });
  });

  it('responde "no existe" y lo guarda aunque falle el barrido de los vencidos', async () => {
    mockedFetchProduct.mockResolvedValue(null);
    db.barcodeCatalogEntry.deleteMany.mockRejectedValue(new Error('connection lost'));

    await expect(lookupBarcode('ana', BARCODE)).resolves.toEqual({ status: 'NOT_FOUND', barcode: BARCODE });
    expect(db.barcodeCatalogEntry.upsert).toHaveBeenCalledTimes(1);
  });

  it('no barre el caché al guardar un producto que existe', async () => {
    mockedFetchProduct.mockResolvedValue(catalogProduct);

    await lookupBarcode('ana', BARCODE);

    expect(db.barcodeCatalogEntry.deleteMany).not.toHaveBeenCalled();
  });

  it('sirve el producto de una fila vencida aunque no pueda postergarla', async () => {
    db.barcodeCatalogEntry.findUnique.mockResolvedValue({
      barcode: BARCODE,
      found: true,
      ...catalogProduct,
      fetchedAt: new Date(0),
      expiresAt: new Date(0),
    });
    mockedFetchProduct.mockRejectedValue({ status: 504, message: 'El catálogo tardó demasiado' });
    db.barcodeCatalogEntry.updateMany.mockRejectedValue(new Error('connection lost'));

    await expect(lookupBarcode('ana', BARCODE)).resolves.toMatchObject({
      status: 'FOUND',
      suggestion: { name: 'Coca Cola Original 2,25 L' },
    });
    expect(db.barcodeCatalogEntry.upsert).not.toHaveBeenCalled();
  });
});
