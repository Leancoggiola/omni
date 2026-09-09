import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
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

router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user as { userId: string };
    res.json(await pantryService.getSummary(userId));
  } catch (err) {
    next(err);
  }
});

router.get('/products', validate(listPantryProductsSchema, 'query'), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.json(await pantryService.listProducts(userId, req.query as unknown as ListPantryProductsParams));
  } catch (err) {
    next(err);
  }
});

router.get(
  '/products/suggest',
  suggestLimiter,
  validate(suggestPantryProductsSchema, 'query'),
  async (req, res, next) => {
    try {
      const { userId } = req.user as { userId: string };
      res.json(await pantryService.suggestProducts(userId, req.query as unknown as SuggestPantryProductsParams));
    } catch (err) {
      next(err);
    }
  }
);

router.get('/products/:productId', async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.json(await pantryService.getProduct(userId, req.params.productId as string));
  } catch (err) {
    next(err);
  }
});

router.post('/products', validate(createPantryProductSchema), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.status(201).json(await pantryService.createProduct(userId, req.body));
  } catch (err) {
    next(err);
  }
});

router.patch('/products/:productId', validate(updatePantryProductSchema), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.json(await pantryService.updateProduct(userId, req.params.productId as string, req.body));
  } catch (err) {
    next(err);
  }
});

router.delete('/products/:productId', async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    await pantryService.deleteProduct(userId, req.params.productId as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get('/shopping-list', async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.json(await pantryService.listShoppingList(userId));
  } catch (err) {
    next(err);
  }
});

router.post('/shopping-list/generate', async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.json(await pantryService.generateShoppingList(userId));
  } catch (err) {
    next(err);
  }
});

router.post('/shopping-list/items', validate(addShoppingListItemSchema), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.status(201).json(await pantryService.addShoppingListItem(userId, req.body));
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/shopping-list/items/:itemId/complete',
  validate(completeShoppingListItemSchema),
  async (req, res, next) => {
    try {
      const { userId } = req.user as { userId: string };
      res.json(await pantryService.completeShoppingListItem(userId, req.params.itemId as string, req.body));
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/shopping-list/items/:itemId', async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    await pantryService.deleteShoppingListItem(userId, req.params.itemId as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.delete('/shopping-list/checked', async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    await pantryService.clearCheckedShoppingList(userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
