import { Router } from 'express';
import { idParamsSchema } from '@omni/shared/common';
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

router.get('/friends', async (req, res) => {
  const { userId } = req.user!;
  res.json(await splitService.listFriends(userId));
});

router.get('/friends/suggest', suggestLimiter, validate(suggestSplitFriendsSchema, 'query'), async (req, res) => {
  const { userId } = req.user!;
  res.json(await splitService.suggestFriends(userId, validatedQuery<SuggestSplitFriendsParams>(req)));
});

router.post('/friends', validate(createSplitFriendSchema), async (req, res) => {
  const { userId } = req.user!;
  res.status(201).json(await splitService.createFriend(userId, req.body));
});

router.patch(
  '/friends/:friendId',
  validate(idParamsSchema('friendId'), 'params'),
  validate(updateSplitFriendSchema),
  async (req, res) => {
    const { userId } = req.user!;
    res.json(await splitService.updateFriend(userId, req.params.friendId as string, req.body));
  }
);

router.delete('/friends/:friendId', validate(idParamsSchema('friendId'), 'params'), async (req, res) => {
  const { userId } = req.user!;
  await splitService.deleteFriend(userId, req.params.friendId as string);
  res.status(204).send();
});

router.get('/gatherings', validate(listGatheringsSchema, 'query'), async (req, res) => {
  const { userId } = req.user!;
  res.json(await splitService.listGatherings(userId, validatedQuery<ListGatheringsParams>(req)));
});

router.get('/gatherings/:gatheringId', validate(idParamsSchema('gatheringId'), 'params'), async (req, res) => {
  const { userId } = req.user!;
  res.json(await splitService.getGathering(userId, req.params.gatheringId as string));
});

router.post('/gatherings', validate(createGatheringSchema), async (req, res) => {
  const { userId } = req.user!;
  res.status(201).json(await splitService.createGathering(userId, req.body));
});

router.patch(
  '/gatherings/:gatheringId/settled',
  validate(idParamsSchema('gatheringId'), 'params'),
  validate(toggleGatheringSettledSchema),
  async (req, res) => {
    const { userId } = req.user!;
    res.json(await splitService.toggleGatheringSettled(userId, req.params.gatheringId as string, req.body));
  }
);

router.delete('/gatherings/:gatheringId', validate(idParamsSchema('gatheringId'), 'params'), async (req, res) => {
  const { userId } = req.user!;
  await splitService.deleteGathering(userId, req.params.gatheringId as string);
  res.status(204).send();
});

router.post(
  '/gatherings/:gatheringId/expenses',
  validate(idParamsSchema('gatheringId'), 'params'),
  validate(addGatheringExpenseSchema),
  async (req, res) => {
    const { userId } = req.user!;
    res.status(201).json(await splitService.addGatheringExpense(userId, req.params.gatheringId as string, req.body));
  }
);

router.delete(
  '/gatherings/:gatheringId/expenses/:expenseId',
  validate(idParamsSchema('gatheringId', 'expenseId'), 'params'),
  async (req, res) => {
    const { userId } = req.user!;
    await splitService.deleteGatheringExpense(userId, req.params.gatheringId as string, req.params.expenseId as string);
    res.status(204).send();
  }
);

export default router;
