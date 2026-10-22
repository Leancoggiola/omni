import { Router } from 'express';
import { idParamsSchema } from '@omni/shared/common';
import { createUserSchema } from '@omni/shared/auth';
import { validate } from '../common/utils';
import { authenticateJwt } from '../auth/middleware/auth.middleware';
import { requireAdmin } from '../auth/middleware/admin.guard';
import * as adminService from './admin.service';

const router = Router();

router.use(authenticateJwt, requireAdmin);

router.post('/users', validate(createUserSchema), async (req, res) => {
  const user = await adminService.createUser(req.body);
  res.status(201).json({ user });
});

router.get('/users', async (_req, res) => {
  const users = await adminService.listUsers();
  res.json({ users });
});

router.delete('/users/:id', validate(idParamsSchema('id'), 'params'), async (req, res) => {
  const { userId } = req.user!;
  const result = await adminService.deleteUser(req.params.id as string, userId);
  res.json(result);
});

export default router;
