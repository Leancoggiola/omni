import { Router } from 'express';
import { householdInviteCodeSchema } from '@omni/shared/household';
import { authenticateJwt } from '../auth/middleware/auth.middleware';
import { createRateLimiter, validate } from '../common/utils';
import * as householdService from './household.service';

const inviteLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    statusCode: 429,
    message: 'Demasiados intentos con códigos de invitación, intenta de nuevo más tarde',
  },
});

const router = Router();
router.use(authenticateJwt);

router.get('/', async (req, res) => {
  res.json(await householdService.getHousehold(req.user!.userId));
});

router.post('/invite', inviteLimiter, async (req, res) => {
  res.status(201).json(await householdService.createInvite(req.user!.userId));
});

router.delete('/invite', async (req, res) => {
  await householdService.revokeInvite(req.user!.userId);
  res.status(204).send();
});

router.post('/invite/preview', inviteLimiter, validate(householdInviteCodeSchema), async (req, res) => {
  res.json(await householdService.previewInvite(req.user!.userId, req.body.code));
});

router.post('/invite/accept', inviteLimiter, validate(householdInviteCodeSchema), async (req, res) => {
  res.json(await householdService.acceptInvite(req.user!.userId, req.body.code));
});

router.post('/leave', async (req, res) => {
  res.json(await householdService.leaveHousehold(req.user!.userId));
});

export default router;
