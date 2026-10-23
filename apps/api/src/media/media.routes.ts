import { Router } from 'express';
import { idParamsSchema } from '@omni/shared/common';
import {
  searchMediaSchema,
  addMediaItemSchema,
  updateMediaItemSchema,
  filterMediaSchema,
  type FilterMediaParams,
} from '@omni/shared/media';
import { authenticateJwt } from '../auth/middleware/auth.middleware';
import { createRateLimiter, validate } from '../common/utils';
import * as mediaService from './media.service';
import { validatedQuery } from '../common/http';
import type { z } from 'zod';

const searchLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    statusCode: 429,
    message: 'Demasiadas búsquedas, intenta de nuevo más tarde',
  },
});

const router = Router();

router.use(authenticateJwt);

router.get('/search', searchLimiter, validate(searchMediaSchema, 'query'), async (req, res) => {
  const { query, page, type } = validatedQuery<z.infer<typeof searchMediaSchema>>(req);
  const result = await mediaService.search(query, page, type);
  res.json(result);
});

router.get('/list', validate(filterMediaSchema, 'query'), async (req, res) => {
  const { userId } = req.user!;
  const result = await mediaService.getList(userId, validatedQuery<FilterMediaParams>(req));
  res.json(result);
});

router.post('/list', validate(addMediaItemSchema), async (req, res) => {
  const { userId } = req.user!;
  const result = await mediaService.addToList(userId, req.body);
  res.status(201).json(result);
});

router.patch(
  '/list/:id',
  validate(idParamsSchema('id'), 'params'),
  validate(updateMediaItemSchema),
  async (req, res) => {
    const { userId } = req.user!;
    const result = await mediaService.updateStatus(userId, req.params.id as string, req.body);
    res.json(result);
  }
);

router.delete('/list/:id', validate(idParamsSchema('id'), 'params'), async (req, res) => {
  const { userId } = req.user!;
  await mediaService.removeFromList(userId, req.params.id as string);
  res.status(204).send();
});

export default router;
