import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { prisma } from '../../common/db';
import { authHeader } from '../../test/integration/auth';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { createPantryProduct, createShoppingListItem, createUser, toJwtUser } from '../../test/integration/factories';
import { findRecordedCall } from '../../test/integration/queryRecorder';

const app = createIntegrationApp();

describe('pantry routes (integration)', () => {
  let user: Awaited<ReturnType<typeof createUser>>;
  let auth: string;

  beforeEach(async () => {
    user = await createUser({ username: 'pantry-owner' });
    auth = authHeader(toJwtUser(user));
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/pantry/summary');
    expect(res.status).toBe(401);
  });

  describe('summary', () => {
    it('GET /summary counts products, low stock and pending shopping items', async () => {
      await createPantryProduct(user.id, { name: 'Arroz', quantity: 1, minQuantity: 2 });
      await createPantryProduct(user.id, { name: 'Fideos', quantity: 10, minQuantity: 2 });
      await createShoppingListItem(user.id, { checked: false });
      await createShoppingListItem(user.id, { checked: true });

      const res = await request(app).get('/api/pantry/summary').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ totalProducts: 2, lowStockCount: 1, shoppingListCount: 1 });
    });
  });

  describe('products', () => {
    it('GET /products returns a paginated list scoped to the user', async () => {
      await createPantryProduct(user.id, { name: 'Arroz' });
      const other = await createUser({ username: 'pantry-other' });
      await createPantryProduct(other.id, { name: 'Ajeno' });

      const res = await request(app).get('/api/pantry/products').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body).toMatchObject({ total: 1, page: 1, limit: 50 });
    });

    it('GET /products sends numeric take and skip to Prisma', async () => {
      await createPantryProduct(user.id, { name: 'Arroz' });
      await createPantryProduct(user.id, { name: 'Banana' });
      await createPantryProduct(user.id, { name: 'Cacao' });

      const res = await request(app).get('/api/pantry/products?page=2&limit=2').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      const call = findRecordedCall('pantryProduct', 'findMany');
      expect(call?.args?.take).toBe(2);
      expect(call?.args?.skip).toBe(2);
    });

    it('GET /products filters by category', async () => {
      await createPantryProduct(user.id, { name: 'Arroz', category: 'GRAINS' });
      await createPantryProduct(user.id, { name: 'Leche', category: 'DAIRY' });

      const res = await request(app).get('/api/pantry/products?category=DAIRY').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({ name: 'Leche' });
    });

    it('GET /products/suggest requires q', async () => {
      const res = await request(app).get('/api/pantry/products/suggest').set('Authorization', auth);
      expect(res.status).toBe(400);
    });

    it('GET /products/suggest returns matching products', async () => {
      await createPantryProduct(user.id, { name: 'Arroz' });
      await createPantryProduct(user.id, { name: 'Leche' });

      const res = await request(app).get('/api/pantry/products/suggest?q=arr').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ name: 'Arroz' });
    });

    it('GET /products/:productId returns 404 when it belongs to another user', async () => {
      const other = await createUser({ username: 'pantry-other' });
      const product = await createPantryProduct(other.id);

      const res = await request(app).get(`/api/pantry/products/${product.id}`).set('Authorization', auth);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Producto no encontrado');
    });

    it('POST /products persists the product', async () => {
      const res = await request(app)
        .post('/api/pantry/products')
        .set('Authorization', auth)
        .send({ name: 'Arroz', category: 'GRAINS', unit: 'UNITS', quantity: 2 });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: 'Arroz', category: 'GRAINS', quantity: 2 });
      const stored = await prisma.pantryProduct.findMany({ where: { userId: user.id } });
      expect(stored).toHaveLength(1);
      expect(stored[0]?.nameNormalized).toBe('arroz');
    });

    it('POST /products returns 400 on an invalid payload', async () => {
      const res = await request(app).post('/api/pantry/products').set('Authorization', auth).send({ name: 'Arroz' });
      expect(res.status).toBe(400);
    });

    it('POST /products returns 409 on a duplicate name', async () => {
      await createPantryProduct(user.id, { name: 'Arroz' });

      const res = await request(app)
        .post('/api/pantry/products')
        .set('Authorization', auth)
        .send({ name: 'arroz', category: 'GRAINS', unit: 'UNITS', quantity: 1 });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Ya existe un producto con ese nombre');
    });

    it('PATCH /products/:productId updates the quantity', async () => {
      const product = await createPantryProduct(user.id, { quantity: 1 });

      const res = await request(app)
        .patch(`/api/pantry/products/${product.id}`)
        .set('Authorization', auth)
        .send({ quantity: 3 });

      expect(res.status).toBe(200);
      const stored = await prisma.pantryProduct.findUnique({ where: { id: product.id } });
      expect(Number(stored?.quantity)).toBe(3);
    });

    it('DELETE /products/:productId returns 204 and removes the row', async () => {
      const product = await createPantryProduct(user.id);

      const res = await request(app).delete(`/api/pantry/products/${product.id}`).set('Authorization', auth);

      expect(res.status).toBe(204);
      expect(await prisma.pantryProduct.findUnique({ where: { id: product.id } })).toBeNull();
    });
  });

  describe('shopping list', () => {
    it('GET /shopping-list returns the items of the user', async () => {
      await createShoppingListItem(user.id, { name: 'Leche' });
      const other = await createUser({ username: 'pantry-other' });
      await createShoppingListItem(other.id, { name: 'Ajeno' });

      const res = await request(app).get('/api/pantry/shopping-list').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ name: 'Leche' });
    });

    it('POST /shopping-list/generate adds an item for each low stock product', async () => {
      await createPantryProduct(user.id, { name: 'Arroz', quantity: 1, minQuantity: 2 });
      await createPantryProduct(user.id, { name: 'Fideos', quantity: 10, minQuantity: 2 });
      await createPantryProduct(user.id, { name: 'Sal', quantity: 0, minQuantity: null });

      const res = await request(app).post('/api/pantry/shopping-list/generate').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ name: 'Arroz', source: 'AUTO' });
    });

    it('POST /shopping-list/generate is idempotent for an unchecked auto item', async () => {
      await createPantryProduct(user.id, { name: 'Arroz', quantity: 1, minQuantity: 2 });

      await request(app).post('/api/pantry/shopping-list/generate').set('Authorization', auth);
      const res = await request(app).post('/api/pantry/shopping-list/generate').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(await prisma.pantryShoppingListItem.count({ where: { userId: user.id } })).toBe(1);
    });

    it('POST /shopping-list/items creates a manual item', async () => {
      const res = await request(app)
        .post('/api/pantry/shopping-list/items')
        .set('Authorization', auth)
        .send({ name: 'Leche', quantityToBuy: 1, unit: 'UNITS' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: 'Leche', source: 'MANUAL' });
      expect(await prisma.pantryShoppingListItem.count({ where: { userId: user.id } })).toBe(1);
    });

    it('PATCH /shopping-list/items/:itemId/complete increments the linked product', async () => {
      const product = await createPantryProduct(user.id, { name: 'Arroz', quantity: 1 });
      const item = await createShoppingListItem(user.id, {
        name: 'Arroz',
        pantryProductId: product.id,
        quantityToBuy: 2,
      });

      const res = await request(app)
        .patch(`/api/pantry/shopping-list/items/${item.id}/complete`)
        .set('Authorization', auth)
        .send({ quantityPurchased: 2 });

      expect(res.status).toBe(200);
      expect(res.body.product).toMatchObject({ name: 'Arroz', quantity: 3 });
      const storedItem = await prisma.pantryShoppingListItem.findUnique({ where: { id: item.id } });
      expect(storedItem?.checked).toBe(true);
    });

    it('PATCH /shopping-list/items/:itemId/complete requires a category for a brand new product', async () => {
      const item = await createShoppingListItem(user.id, { name: 'Yerba', quantityToBuy: 1 });

      const res = await request(app)
        .patch(`/api/pantry/shopping-list/items/${item.id}/complete`)
        .set('Authorization', auth)
        .send({ quantityPurchased: 1 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('La categoría es obligatoria para productos nuevos');
    });

    it('PATCH /shopping-list/items/:itemId/complete creates the product when a category is given', async () => {
      const item = await createShoppingListItem(user.id, { name: 'Yerba', quantityToBuy: 1 });

      const res = await request(app)
        .patch(`/api/pantry/shopping-list/items/${item.id}/complete`)
        .set('Authorization', auth)
        .send({ quantityPurchased: 1, category: 'BEVERAGES' });

      expect(res.status).toBe(200);
      expect(res.body.product).toMatchObject({ name: 'Yerba', category: 'BEVERAGES' });
    });

    it('DELETE /shopping-list/items/:itemId returns 204', async () => {
      const item = await createShoppingListItem(user.id);

      const res = await request(app).delete(`/api/pantry/shopping-list/items/${item.id}`).set('Authorization', auth);

      expect(res.status).toBe(204);
      expect(await prisma.pantryShoppingListItem.findUnique({ where: { id: item.id } })).toBeNull();
    });

    it('DELETE /shopping-list/items/:itemId returns 404 for an item of another user', async () => {
      const other = await createUser({ username: 'pantry-other' });
      const item = await createShoppingListItem(other.id);

      const res = await request(app).delete(`/api/pantry/shopping-list/items/${item.id}`).set('Authorization', auth);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Ítem no encontrado');
    });

    it('DELETE /shopping-list/checked removes only the checked items', async () => {
      await createShoppingListItem(user.id, { name: 'Pendiente', checked: false });
      await createShoppingListItem(user.id, { name: 'Comprado', checked: true });

      const res = await request(app).delete('/api/pantry/shopping-list/checked').set('Authorization', auth);

      expect(res.status).toBe(204);
      const remaining = await prisma.pantryShoppingListItem.findMany({ where: { userId: user.id } });
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.name).toBe('Pendiente');
    });
  });
});
