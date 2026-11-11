import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { API_PATHS } from '@omni/shared/api';

import { prisma } from '../../common/db';
import { HttpError } from '../../common/http';
import { authHeader } from '../../test/integration/auth';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { createPantryProduct, createUser, householdIdOf, linkUsers, toJwtUser } from '../../test/integration/factories';

vi.mock('../../pantry/open-food-facts.service');

import * as openFoodFactsService from '../../pantry/open-food-facts.service';

const mockedOpenFoodFacts = vi.mocked(openFoodFactsService);

const app = createIntegrationApp();
const DAY_MS = 24 * 60 * 60 * 1000;

const COKE = '7790895000997';
const COOKIES = '7622210449283';
const UNKNOWN = '7791234500000';
const EAN8 = '96385074';
const WRONG_CHECK_DIGIT = '7790895000998';
const INTERNAL_CODES = ['2000000000008', '0200000000004', '20000004'];

const cokeCatalog = {
  name: 'Coca Cola Original',
  brand: 'Coca-Cola',
  packageSize: '2,25 L',
  category: 'BEVERAGES' as const,
};
const cokeForm = { name: 'Coca Cola Original 2,25 L', category: 'BEVERAGES', unit: 'PACKAGES' };

type TestUser = Awaited<ReturnType<typeof createUser>>;

function as(user: TestUser) {
  return authHeader(toJwtUser(user));
}

function lookup(user: TestUser, barcode: string) {
  return request(app).get(API_PATHS.pantry.barcode(barcode)).set('Authorization', as(user));
}

function scan(user: TestUser, body: Record<string, unknown>) {
  return request(app).post(API_PATHS.pantry.productsScan).set('Authorization', as(user)).send(body);
}

function adjustStock(user: TestUser, productId: string, body: Record<string, unknown>) {
  return request(app).post(API_PATHS.pantry.productStock(productId)).set('Authorization', as(user)).send(body);
}

/** Días que faltan para que venza una fila del caché, redondeados: alcanza para distinguir 7 de 30. */
function daysUntil(date: Date) {
  return Math.round((date.getTime() - Date.now()) / DAY_MS);
}

describe('pantry barcode routes (integration)', () => {
  let ana: TestUser;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockedOpenFoodFacts.fetchProduct.mockResolvedValue(null);
    ana = await createUser({ username: 'ana', name: 'Ana' });
  });

  describe('GET /barcodes/:barcode', () => {
    it('devuelve 401 sin auth', async () => {
      const res = await request(app).get(API_PATHS.pantry.barcode(COKE));

      expect(res.status).toBe(401);
      expect(mockedOpenFoodFacts.fetchProduct).not.toHaveBeenCalled();
    });

    it.each([
      ['con letras', 'abcdefgh'],
      ['de 12 dígitos', '779089500099'],
      ['de 14 dígitos', '07790895000997'],
      ['con el dígito verificador mal', WRONG_CHECK_DIGIT],
      ['con espacios', '7790895 00997'],
    ])('devuelve 400 con un código %s', async (_case, barcode) => {
      const res = await lookup(ana, encodeURIComponent(barcode));

      expect(res.status).toBe(400);
      expect(mockedOpenFoodFacts.fetchProduct).not.toHaveBeenCalled();
    });

    it.each(INTERNAL_CODES)('devuelve 400 con el código interno %s sin consultar el catálogo', async barcode => {
      const res = await lookup(ana, barcode);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/interno del comercio/);
      expect(mockedOpenFoodFacts.fetchProduct).not.toHaveBeenCalled();
      expect(await prisma.barcodeCatalogEntry.count()).toBe(0);
    });

    it('responde IN_PANTRY con el producto del hogar sin consultar el catálogo', async () => {
      const product = await createPantryProduct(ana.id, { name: 'Coca', quantity: 2, barcode: COKE });

      const res = await lookup(ana, COKE);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: 'IN_PANTRY',
        barcode: COKE,
        product: { id: product.id, name: 'Coca', quantity: 2, barcode: COKE },
      });
      expect(mockedOpenFoodFacts.fetchProduct).not.toHaveBeenCalled();
      expect(await prisma.barcodeCatalogEntry.count()).toBe(0);
    });

    it('responde FOUND con la sugerencia para el formulario y guarda el código 30 días', async () => {
      mockedOpenFoodFacts.fetchProduct.mockResolvedValue(cokeCatalog);

      const res = await lookup(ana, COKE);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'FOUND',
        barcode: COKE,
        suggestion: {
          name: 'Coca Cola Original 2,25 L',
          brand: 'Coca-Cola',
          packageSize: '2,25 L',
          category: 'BEVERAGES',
          unit: 'PACKAGES',
          sourceUrl: `https://world.openfoodfacts.org/product/${COKE}`,
        },
      });
      expect(mockedOpenFoodFacts.fetchProduct).toHaveBeenCalledWith(COKE, ana.id);
      const entry = await prisma.barcodeCatalogEntry.findUniqueOrThrow({ where: { barcode: COKE } });
      expect(entry).toMatchObject({ found: true, ...cokeCatalog });
      expect(daysUntil(entry.expiresAt)).toBe(30);
    });

    it('acepta un EAN-8', async () => {
      mockedOpenFoodFacts.fetchProduct.mockResolvedValue({ ...cokeCatalog, category: null });

      const res = await lookup(ana, EAN8);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'FOUND', barcode: EAN8, suggestion: { category: null } });
    });

    it('responde NOT_FOUND y guarda el código 7 días', async () => {
      const res = await lookup(ana, UNKNOWN);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'NOT_FOUND', barcode: UNKNOWN });
      const entry = await prisma.barcodeCatalogEntry.findUniqueOrThrow({ where: { barcode: UNKNOWN } });
      expect(entry).toMatchObject({ found: false, name: null, brand: null, packageSize: null, category: null });
      expect(daysUntil(entry.expiresAt)).toBe(7);
    });

    it('sirve desde el caché en la segunda consulta, también para otro hogar', async () => {
      mockedOpenFoodFacts.fetchProduct.mockResolvedValue(cokeCatalog);
      const beto = await createUser({ username: 'beto' });

      const first = await lookup(ana, COKE);
      const second = await lookup(beto, COKE);
      const missA = await lookup(ana, UNKNOWN);
      const missB = await lookup(beto, UNKNOWN);

      expect(second.body).toEqual(first.body);
      expect(missA.body).toEqual(missB.body);
      expect(mockedOpenFoodFacts.fetchProduct).toHaveBeenCalledTimes(2);
    });

    it.each([
      [502, 'No se pudo consultar el catálogo de productos'],
      [503, 'Hay muchas consultas al catálogo de productos, probá de nuevo en un minuto'],
      [504, 'El catálogo de productos tardó demasiado en responder'],
    ])('devuelve %i si el catálogo falla y no guarda nada', async (status, message) => {
      mockedOpenFoodFacts.fetchProduct.mockRejectedValue(new HttpError(status, message));

      const res = await lookup(ana, COKE);

      expect(res.status).toBe(status);
      expect(res.body).toEqual({ statusCode: status, message });
      expect(await prisma.barcodeCatalogEntry.count()).toBe(0);
    });

    it('después de una falla vuelve a consultar el catálogo', async () => {
      mockedOpenFoodFacts.fetchProduct.mockRejectedValueOnce(new HttpError(502, 'boom'));
      mockedOpenFoodFacts.fetchProduct.mockResolvedValueOnce(cokeCatalog);

      const failed = await lookup(ana, COKE);
      const retried = await lookup(ana, COKE);

      expect(failed.status).toBe(502);
      expect(retried.body.status).toBe('FOUND');
    });

    it('vuelve a consultar una fila vencida y renueva el caché', async () => {
      await prisma.barcodeCatalogEntry.create({
        data: { barcode: COKE, found: false, fetchedAt: new Date(Date.now() - 8 * DAY_MS), expiresAt: new Date(0) },
      });
      mockedOpenFoodFacts.fetchProduct.mockResolvedValue(cokeCatalog);

      const res = await lookup(ana, COKE);

      expect(res.body.status).toBe('FOUND');
      expect(mockedOpenFoodFacts.fetchProduct).toHaveBeenCalledTimes(1);
      const entry = await prisma.barcodeCatalogEntry.findUniqueOrThrow({ where: { barcode: COKE } });
      expect(entry).toMatchObject({ found: true, name: 'Coca Cola Original' });
      expect(daysUntil(entry.expiresAt)).toBe(30);
    });

    it('si el catálogo falla sirve el producto de una fila vencida y la posterga una hora', async () => {
      const fetchedAt = new Date(Date.now() - 31 * DAY_MS);
      await prisma.barcodeCatalogEntry.create({
        data: { barcode: COKE, found: true, ...cokeCatalog, fetchedAt, expiresAt: new Date(Date.now() - DAY_MS) },
      });
      mockedOpenFoodFacts.fetchProduct.mockRejectedValue(new HttpError(504, 'timeout'));

      const res = await lookup(ana, COKE);
      const again = await lookup(ana, COKE);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'FOUND', suggestion: { name: 'Coca Cola Original 2,25 L' } });
      expect(again.body).toEqual(res.body);
      expect(mockedOpenFoodFacts.fetchProduct).toHaveBeenCalledTimes(1);
      const entry = await prisma.barcodeCatalogEntry.findUniqueOrThrow({ where: { barcode: COKE } });
      expect(entry.fetchedAt).toEqual(fetchedAt);
      expect(Math.round((entry.expiresAt.getTime() - Date.now()) / 60_000)).toBe(60);
    });

    it('al guardar un "no existe" barre los que ya vencieron y conserva los productos', async () => {
      const fetchedAt = new Date(Date.now() - 40 * DAY_MS);
      await prisma.barcodeCatalogEntry.createMany({
        data: [
          { barcode: COOKIES, found: false, fetchedAt, expiresAt: new Date(0) },
          { barcode: COKE, found: true, ...cokeCatalog, fetchedAt, expiresAt: new Date(0) },
          { barcode: EAN8, found: false, fetchedAt: new Date(), expiresAt: new Date(Date.now() + DAY_MS) },
        ],
      });

      const res = await lookup(ana, UNKNOWN);

      expect(res.body).toEqual({ status: 'NOT_FOUND', barcode: UNKNOWN });
      const entries = await prisma.barcodeCatalogEntry.findMany({ select: { barcode: true } });
      expect(entries.map(entry => entry.barcode).sort()).toEqual([COKE, UNKNOWN, EAN8].sort());
    });

    it('si el catálogo falla no convierte un "no existe" vencido en respuesta', async () => {
      await prisma.barcodeCatalogEntry.create({
        data: { barcode: UNKNOWN, found: false, fetchedAt: new Date(Date.now() - 8 * DAY_MS), expiresAt: new Date(0) },
      });
      mockedOpenFoodFacts.fetchProduct.mockRejectedValue(new HttpError(502, 'boom'));

      const res = await lookup(ana, UNKNOWN);

      expect(res.status).toBe(502);
    });

    it('el código vinculado en otro hogar no se ve desde el propio', async () => {
      const beto = await createUser({ username: 'beto' });
      await createPantryProduct(beto.id, { name: 'Coca', barcode: COKE });

      const res = await lookup(ana, COKE);

      expect(res.body).toEqual({ status: 'NOT_FOUND', barcode: COKE });
    });
  });

  describe('POST /products/scan', () => {
    it('devuelve 401 sin auth', async () => {
      const res = await request(app).post(API_PATHS.pantry.productsScan).send({ barcode: COKE });

      expect(res.status).toBe(401);
    });

    it('suma 1 al producto que ya tiene el código, sin pedir más datos', async () => {
      const product = await createPantryProduct(ana.id, { name: 'Coca', quantity: 2, barcode: COKE });

      const res = await scan(ana, { barcode: COKE });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        outcome: 'INCREMENTED',
        product: { id: product.id, quantity: 3, barcode: COKE, updatedById: ana.id },
      });
      expect(mockedOpenFoodFacts.fetchProduct).not.toHaveBeenCalled();
    });

    it('suma la cantidad indicada, con decimales', async () => {
      await createPantryProduct(ana.id, { name: 'Coca', quantity: 0.1, barcode: COKE });

      const res = await scan(ana, { barcode: COKE, quantity: 0.2 });

      expect(res.body.product.quantity).toBe(0.3);
    });

    it('no pasa del máximo que admite la columna', async () => {
      await createPantryProduct(ana.id, { name: 'Coca', quantity: 99_999_999, barcode: COKE });

      const res = await scan(ana, { barcode: COKE, quantity: 5 });

      expect(res.status).toBe(200);
      expect(res.body.product.quantity).toBe(99_999_999.99);
    });

    it('si el código ya está vinculado ignora los datos del formulario', async () => {
      const product = await createPantryProduct(ana.id, {
        name: 'Coca',
        category: 'SNACKS',
        quantity: 1,
        barcode: COKE,
      });

      const res = await scan(ana, { barcode: COKE, product: cokeForm });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        outcome: 'INCREMENTED',
        product: { id: product.id, name: 'Coca', category: 'SNACKS', quantity: 2 },
      });
      expect(await prisma.pantryProduct.count({ where: { createdById: ana.id } })).toBe(1);
    });

    it('da de alta el producto con el código y la autoría', async () => {
      const res = await scan(ana, {
        barcode: COKE,
        quantity: 2,
        product: { ...cokeForm, minQuantity: 1, expiresAt: '2027-03-15' },
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        outcome: 'CREATED',
        product: {
          name: 'Coca Cola Original 2,25 L',
          category: 'BEVERAGES',
          unit: 'PACKAGES',
          quantity: 2,
          minQuantity: 1,
          expiresAt: '2027-03-15',
          barcode: COKE,
          createdById: ana.id,
          updatedById: ana.id,
          isLowStock: false,
        },
      });
      const row = await prisma.pantryProduct.findUniqueOrThrow({ where: { id: res.body.product.id } });
      expect(row).toMatchObject({
        householdId: await householdIdOf(ana.id),
        nameNormalized: 'coca cola original 2,25 l',
        barcode: COKE,
      });
    });

    it('da de alta con cantidad 1 si no se indica, y la del formulario no cuenta', async () => {
      const res = await scan(ana, { barcode: COKE, product: { ...cokeForm, quantity: 40 } });

      expect(res.status).toBe(201);
      expect(res.body.product).toMatchObject({ quantity: 1, minQuantity: null, expiresAt: null });
    });

    it('recorta los espacios del nombre al dar de alta', async () => {
      const res = await scan(ana, { barcode: COKE, product: { ...cokeForm, name: '  Coca Zero  ' } });

      expect(res.status).toBe(201);
      expect(res.body.product.name).toBe('Coca Zero');
    });

    it('vincula el código a un producto con el mismo nombre y conserva sus datos', async () => {
      const product = await createPantryProduct(ana.id, {
        name: 'coca cola original 2,25 l',
        category: 'SNACKS',
        unit: 'UNITS',
        quantity: 4,
        minQuantity: 2,
        expiresAt: new Date('2027-01-10T00:00:00.000Z'),
      });

      const res = await scan(ana, { barcode: COKE, product: { ...cokeForm, expiresAt: '2028-12-31' } });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        outcome: 'LINKED',
        product: {
          id: product.id,
          name: 'coca cola original 2,25 l',
          category: 'SNACKS',
          unit: 'UNITS',
          quantity: 5,
          minQuantity: 2,
          expiresAt: '2027-01-10',
          barcode: COKE,
          createdById: ana.id,
          updatedById: ana.id,
        },
      });
      expect(await prisma.pantryProduct.count({ where: { createdById: ana.id } })).toBe(1);
    });

    it('si el producto con ese nombre ya tiene otro código solo suma y conserva el suyo', async () => {
      const product = await createPantryProduct(ana.id, { name: cokeForm.name, quantity: 1, barcode: COOKIES });

      const res = await scan(ana, { barcode: COKE, product: cokeForm });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        outcome: 'INCREMENTED',
        product: { id: product.id, quantity: 2, barcode: COOKIES },
      });
      expect((await lookup(ana, COKE)).body.status).toBe('NOT_FOUND');
    });

    it('devuelve 404 si el código no está en la alacena y no llegan los datos del producto', async () => {
      await createPantryProduct(ana.id, { name: 'Coca', barcode: COOKIES });

      const res = await scan(ana, { barcode: COKE });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/no está en tu alacena/);
      expect(await prisma.pantryProduct.count({ where: { createdById: ana.id } })).toBe(1);
    });

    it.each(INTERNAL_CODES)('devuelve 400 con el código interno %s y no crea nada', async barcode => {
      const res = await scan(ana, { barcode, product: cokeForm });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/interno del comercio/);
      expect(await prisma.pantryProduct.count()).toBe(0);
    });

    it.each([
      ['sin código', { product: cokeForm }],
      ['con el dígito verificador mal', { barcode: WRONG_CHECK_DIGIT, product: cokeForm }],
      ['con el código como número', { barcode: 7790895000997, product: cokeForm }],
      ['con cantidad cero', { barcode: COKE, quantity: 0, product: cokeForm }],
      ['con cantidad negativa', { barcode: COKE, quantity: -1, product: cokeForm }],
      ['con cantidad como texto', { barcode: COKE, quantity: '2', product: cokeForm }],
      ['con cantidad fuera de rango', { barcode: COKE, quantity: 100_000_000, product: cokeForm }],
      ['con cantidad de más de dos decimales', { barcode: COKE, quantity: 0.004, product: cokeForm }],
      ['con el nombre vacío', { barcode: COKE, product: { ...cokeForm, name: '   ' } }],
      ['con un nombre de más de 120 caracteres', { barcode: COKE, product: { ...cokeForm, name: 'a'.repeat(121) } }],
      ['sin categoría', { barcode: COKE, product: { name: 'Coca', unit: 'PACKAGES' } }],
      ['con una categoría que no existe', { barcode: COKE, product: { ...cokeForm, category: 'DRINKS' } }],
      ['con una unidad que no existe', { barcode: COKE, product: { ...cokeForm, unit: 'LITERS' } }],
      ['con un mínimo negativo', { barcode: COKE, product: { ...cokeForm, minQuantity: -1 } }],
      ['con un vencimiento que no es una fecha', { barcode: COKE, product: { ...cokeForm, expiresAt: '15/03/2027' } }],
    ])('devuelve 400 %s', async (_case, body) => {
      const res = await scan(ana, body);

      expect(res.status).toBe(400);
      expect(await prisma.pantryProduct.count()).toBe(0);
    });

    it('la otra persona del hogar reconoce el código y suma al mismo producto', async () => {
      const beto = await createUser({ username: 'beto', name: 'Beto' });
      await linkUsers(ana.id, beto.id);
      const created = await scan(ana, { barcode: COKE, product: cokeForm });

      const seen = await lookup(beto, COKE);
      const added = await scan(beto, { barcode: COKE });

      expect(seen.body).toMatchObject({ status: 'IN_PANTRY', product: { id: created.body.product.id } });
      expect(added.body).toMatchObject({
        outcome: 'INCREMENTED',
        product: { id: created.body.product.id, quantity: 2, createdById: ana.id, updatedById: beto.id },
      });
    });

    it('dos hogares pueden tener el mismo código, cada uno en su producto', async () => {
      const beto = await createUser({ username: 'beto' });
      const mine = await scan(ana, { barcode: COKE, product: cokeForm });

      const theirs = await scan(beto, { barcode: COKE, quantity: 3, product: { ...cokeForm, name: 'Coca' } });

      expect(theirs.status).toBe(201);
      expect(theirs.body.product.id).not.toBe(mine.body.product.id);
      expect((await lookup(ana, COKE)).body.product).toMatchObject({ id: mine.body.product.id, quantity: 1 });
      expect((await lookup(beto, COKE)).body.product).toMatchObject({ id: theirs.body.product.id, quantity: 3 });
    });

    it('escanear dos veces seguidas el mismo código nuevo crea un solo producto', async () => {
      const first = await scan(ana, { barcode: COKE, product: cokeForm });
      const second = await scan(ana, { barcode: COKE, product: cokeForm });

      expect(first.status).toBe(201);
      expect(second.status).toBe(200);
      expect(second.body).toMatchObject({
        outcome: 'INCREMENTED',
        product: { id: first.body.product.id, quantity: 2 },
      });
      expect(await prisma.pantryProduct.count({ where: { createdById: ana.id } })).toBe(1);
    });
  });

  describe('POST /products/:productId/stock', () => {
    it('devuelve 401 sin auth', async () => {
      const product = await createPantryProduct(ana.id, { quantity: 5 });

      const res = await request(app).post(API_PATHS.pantry.productStock(product.id)).send({ delta: -1 });

      expect(res.status).toBe(401);
    });

    it('deshace un escaneo restando lo que se sumó', async () => {
      const product = await createPantryProduct(ana.id, { name: 'Coca', quantity: 2, barcode: COKE });
      await scan(ana, { barcode: COKE });

      const res = await adjustStock(ana, product.id, { delta: -1 });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: product.id, quantity: 2, barcode: COKE, updatedById: ana.id });
    });

    it('suma con un ajuste positivo, con decimales', async () => {
      const product = await createPantryProduct(ana.id, { quantity: 0.1 });

      const res = await adjustStock(ana, product.id, { delta: 0.2 });

      expect(res.body.quantity).toBe(0.3);
    });

    it('no baja de cero', async () => {
      const product = await createPantryProduct(ana.id, { quantity: 1, minQuantity: 1 });

      const res = await adjustStock(ana, product.id, { delta: -5 });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ quantity: 0, isLowStock: true });
    });

    it('no pisa lo que sumó la otra persona del hogar entre medio', async () => {
      const beto = await createUser({ username: 'beto' });
      await linkUsers(ana.id, beto.id);
      const product = await createPantryProduct(ana.id, { name: 'Coca', quantity: 2, barcode: COKE });
      await scan(ana, { barcode: COKE });
      await scan(beto, { barcode: COKE, quantity: 4 });

      const res = await adjustStock(ana, product.id, { delta: -1 });

      expect(res.body).toMatchObject({ quantity: 6, updatedById: ana.id });
    });

    it.each([
      ['en cero', { delta: 0 }],
      ['como texto', { delta: '1' }],
      ['fuera de rango', { delta: 100_000_000 }],
      ['de más de dos decimales', { delta: 0.004 }],
      ['faltante', {}],
      ['con campos de más', { delta: 1, quantity: 9 }],
    ])('devuelve 400 con un ajuste %s', async (_case, body) => {
      const product = await createPantryProduct(ana.id, { quantity: 5 });

      const res = await adjustStock(ana, product.id, body);

      expect(res.status).toBe(400);
      expect((await prisma.pantryProduct.findUniqueOrThrow({ where: { id: product.id } })).quantity.toString()).toBe(
        '5'
      );
    });

    it('devuelve 404 con un producto de otro hogar y no lo toca', async () => {
      const beto = await createUser({ username: 'beto' });
      const theirs = await createPantryProduct(beto.id, { quantity: 5 });

      const res = await adjustStock(ana, theirs.id, { delta: -1 });

      expect(res.status).toBe(404);
      expect((await prisma.pantryProduct.findUniqueOrThrow({ where: { id: theirs.id } })).quantity.toString()).toBe(
        '5'
      );
    });

    it('devuelve 404 con un producto que no existe', async () => {
      const res = await adjustStock(ana, 'product-inexistente', { delta: 1 });

      expect(res.status).toBe(404);
    });
  });

  describe('código vinculado en el resto de la alacena', () => {
    it('el alta manual nace sin código, aunque se mande uno', async () => {
      const res = await request(app)
        .post(API_PATHS.pantry.products)
        .set('Authorization', as(ana))
        .send({ name: 'Coca', category: 'BEVERAGES', unit: 'PACKAGES', quantity: 1, barcode: COKE });

      expect(res.status).toBe(201);
      expect(res.body.barcode).toBeNull();
    });

    it('el listado y el detalle incluyen el código', async () => {
      const product = await createPantryProduct(ana.id, { name: 'Coca', barcode: COKE });

      const list = await request(app).get(API_PATHS.pantry.products).set('Authorization', as(ana));
      const detail = await request(app).get(API_PATHS.pantry.product(product.id)).set('Authorization', as(ana));

      expect(list.body.items[0].barcode).toBe(COKE);
      expect(detail.body.barcode).toBe(COKE);
    });

    it('PATCH con barcode null quita el código y el producto deja de reconocerse al escanear', async () => {
      const product = await createPantryProduct(ana.id, { name: 'Coca', quantity: 2, barcode: COKE });

      const res = await request(app)
        .patch(API_PATHS.pantry.product(product.id))
        .set('Authorization', as(ana))
        .send({ barcode: null });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: product.id, quantity: 2, barcode: null });
      expect((await lookup(ana, COKE)).body.status).toBe('NOT_FOUND');
      expect((await scan(ana, { barcode: COKE })).status).toBe(404);
    });

    it('PATCH no permite vincular un código: eso solo pasa al escanear', async () => {
      const product = await createPantryProduct(ana.id, { name: 'Coca' });

      const res = await request(app)
        .patch(API_PATHS.pantry.product(product.id))
        .set('Authorization', as(ana))
        .send({ barcode: COKE });

      expect(res.status).toBe(400);
      expect((await prisma.pantryProduct.findUniqueOrThrow({ where: { id: product.id } })).barcode).toBeNull();
    });

    it('editar otros campos conserva el código', async () => {
      const product = await createPantryProduct(ana.id, { name: 'Coca', barcode: COKE });

      const res = await request(app)
        .patch(API_PATHS.pantry.product(product.id))
        .set('Authorization', as(ana))
        .send({ name: 'Coca Cola', quantity: 9 });

      expect(res.body).toMatchObject({ name: 'Coca Cola', quantity: 9, barcode: COKE });
    });

    it('un código desvinculado se puede vincular a otro producto', async () => {
      const old = await createPantryProduct(ana.id, { name: 'Coca vieja', barcode: COKE });
      await request(app).patch(API_PATHS.pantry.product(old.id)).set('Authorization', as(ana)).send({ barcode: null });

      const res = await scan(ana, { barcode: COKE, product: cokeForm });

      expect(res.status).toBe(201);
      expect(res.body.product.id).not.toBe(old.id);
      expect((await lookup(ana, COKE)).body.product.id).toBe(res.body.product.id);
    });

    it('borrar el producto libera el código', async () => {
      const product = await createPantryProduct(ana.id, { name: 'Coca', barcode: COKE });
      await request(app).delete(API_PATHS.pantry.product(product.id)).set('Authorization', as(ana));

      const res = await scan(ana, { barcode: COKE, product: cokeForm });

      expect(res.status).toBe(201);
    });
  });
});
