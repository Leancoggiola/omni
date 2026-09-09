import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import {
  addGatheringExpenseSchema,
  createGatheringSchema,
  createSplitFriendSchema,
  listGatheringsSchema,
  suggestSplitFriendsSchema,
  toggleGatheringSettledSchema,
  updateSplitFriendSchema,
  type ListGatheringsParams,
  type SuggestSplitFriendsParams,
} from '@omni/shared/split-expenses';
import { authenticateJwt } from '../auth/middleware/auth.middleware';
import { createRateLimiter, validate } from '../common/utils';
import * as splitService from './split-expenses.service';

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

router.get('/friends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user as { userId: string };
    res.json(await splitService.listFriends(userId));
  } catch (err) {
    next(err);
  }
});

router.get('/friends/suggest', suggestLimiter, validate(suggestSplitFriendsSchema, 'query'), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.json(await splitService.suggestFriends(userId, req.query as unknown as SuggestSplitFriendsParams));
  } catch (err) {
    next(err);
  }
});

router.post('/friends', validate(createSplitFriendSchema), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.status(201).json(await splitService.createFriend(userId, req.body));
  } catch (err) {
    next(err);
  }
});

router.patch('/friends/:friendId', validate(updateSplitFriendSchema), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.json(await splitService.updateFriend(userId, req.params.friendId as string, req.body));
  } catch (err) {
    next(err);
  }
});

router.delete('/friends/:friendId', async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    await splitService.deleteFriend(userId, req.params.friendId as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get('/gatherings', validate(listGatheringsSchema, 'query'), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.json(await splitService.listGatherings(userId, req.query as unknown as ListGatheringsParams));
  } catch (err) {
    next(err);
  }
});

router.get('/gatherings/:gatheringId', async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.json(await splitService.getGathering(userId, req.params.gatheringId as string));
  } catch (err) {
    next(err);
  }
});

router.post('/gatherings', validate(createGatheringSchema), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.status(201).json(await splitService.createGathering(userId, req.body));
  } catch (err) {
    next(err);
  }
});

router.patch('/gatherings/:gatheringId/settled', validate(toggleGatheringSettledSchema), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.json(await splitService.toggleGatheringSettled(userId, req.params.gatheringId as string, req.body));
  } catch (err) {
    next(err);
  }
});

router.delete('/gatherings/:gatheringId', async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    await splitService.deleteGathering(userId, req.params.gatheringId as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/gatherings/:gatheringId/expenses', validate(addGatheringExpenseSchema), async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    res.status(201).json(await splitService.addGatheringExpense(userId, req.params.gatheringId as string, req.body));
  } catch (err) {
    next(err);
  }
});

router.delete('/gatherings/:gatheringId/expenses/:expenseId', async (req, res, next) => {
  try {
    const { userId } = req.user as { userId: string };
    await splitService.deleteGatheringExpense(userId, req.params.gatheringId as string, req.params.expenseId as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
