import { Router } from 'express';
import { idParamsSchema } from '@omni/shared/common';
import {
  addShoppingListItemSchema,
  completeShoppingListItemSchema,
  createPantryProductSchema,
  listPantryProductsSchema,
  suggestPantryProductsSchema,
  updatePantryProductSchema,
  type ListPantryProductsParams,
  type SuggestPantryProductsParams,
} from '@omni/shared/pantry';
import { authenticateJwt } from '../auth/middleware/auth.middleware';
import { createRateLimiter, validate } from '../common/utils';
import * as pantryService from './pantry.service';
import { validatedQuery } from '../common/http';

const suggestLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    statusCode: 429,
    message: 'Demasiadas búsquedas, intenta de nuevo más tarde',
  },
});

const router = Router();
router.use(authenticateJwt);

router.get('/summary', async (req, res) => {
  const { userId } = req.user!;
  res.json(await pantryService.getSummary(userId));
});

router.get('/products', validate(listPantryProductsSchema, 'query'), async (req, res) => {
  const { userId } = req.user!;
  res.json(await pantryService.listProducts(userId, validatedQuery<ListPantryProductsParams>(req)));
});

router.get('/products/suggest', suggestLimiter, validate(suggestPantryProductsSchema, 'query'), async (req, res) => {
  const { userId } = req.user!;
  res.json(await pantryService.suggestProducts(userId, validatedQuery<SuggestPantryProductsParams>(req)));
});

router.get('/products/:productId', validate(idParamsSchema('productId'), 'params'), async (req, res) => {
  const { userId } = req.user!;
  res.json(await pantryService.getProduct(userId, req.params.productId as string));
});

router.post('/products', validate(createPantryProductSchema), async (req, res) => {
  const { userId } = req.user!;
  res.status(201).json(await pantryService.createProduct(userId, req.body));
});

router.patch(
  '/products/:productId',
  validate(idParamsSchema('productId'), 'params'),
  validate(updatePantryProductSchema),
  async (req, res) => {
    const { userId } = req.user!;
    res.json(await pantryService.updateProduct(userId, req.params.productId as string, req.body));
  }
);

router.delete('/products/:productId', validate(idParamsSchema('productId'), 'params'), async (req, res) => {
  const { userId } = req.user!;
  await pantryService.deleteProduct(userId, req.params.productId as string);
  res.status(204).send();
});

router.get('/shopping-list', async (req, res) => {
  const { userId } = req.user!;
  res.json(await pantryService.listShoppingList(userId));
});

router.post('/shopping-list/generate', async (req, res) => {
  const { userId } = req.user!;
  res.json(await pantryService.generateShoppingList(userId));
});

router.post('/shopping-list/items', validate(addShoppingListItemSchema), async (req, res) => {
  const { userId } = req.user!;
  res.status(201).json(await pantryService.addShoppingListItem(userId, req.body));
});

router.patch(
  '/shopping-list/items/:itemId/complete',
  validate(idParamsSchema('itemId'), 'params'),
  validate(completeShoppingListItemSchema),
  async (req, res) => {
    const { userId } = req.user!;
    res.json(await pantryService.completeShoppingListItem(userId, req.params.itemId as string, req.body));
  }
);

router.delete('/shopping-list/items/:itemId', validate(idParamsSchema('itemId'), 'params'), async (req, res) => {
  const { userId } = req.user!;
  await pantryService.deleteShoppingListItem(userId, req.params.itemId as string);
  res.status(204).send();
});

router.delete('/shopping-list/checked', async (req, res) => {
  const { userId } = req.user!;
  await pantryService.clearCheckedShoppingList(userId);
  res.status(204).send();
});

export default router;
