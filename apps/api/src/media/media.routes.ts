import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { MediaType } from '@omni/shared/media';
import { searchMediaSchema, addMediaItemSchema, updateMediaItemSchema, filterMediaSchema } from '@omni/shared/media';
import { authenticateJwt } from '../auth/middleware/auth.middleware';
import { createRateLimiter, validate } from '../common/utils';
import * as mediaService from './media.service';

const searchLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    statusCode: 429,
    message: 'Demasiadas búsquedas, intenta de nuevo más tarde',
  },
});

const router = Router();

// All media routes require authentication
router.use(authenticateJwt);

router.get(
  '/search',
  searchLimiter,
  validate(searchMediaSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query, page, type } = req.query as any;
      const result = await mediaService.search(query, page ?? 1, type ?? 'multi');
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/tmdb/:type/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = req.params.type as string as MediaType;
    const id = parseInt(req.params.id as string, 10);
    const result = await mediaService.getTmdbDetail(type, id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/list', validate(filterMediaSchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user as { userId: string };
    const result = await mediaService.getList(userId, req.query as any);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/list', validate(addMediaItemSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user as { userId: string };
    const result = await mediaService.addToList(userId, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.patch('/list/:id', validate(updateMediaItemSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user as { userId: string };
    const result = await mediaService.updateStatus(userId, req.params.id as string, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/list/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user as { userId: string };
    await mediaService.removeFromList(userId, req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
