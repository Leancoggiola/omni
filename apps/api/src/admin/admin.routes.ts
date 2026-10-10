import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createUserSchema } from '@omni/shared/auth';
import { validate } from '../common/utils';
import { authenticateJwt } from '../auth/middleware/auth.middleware';
import { requireAdmin } from '../auth/middleware/admin.guard';
import * as adminService from './admin.service';

const router = Router();

router.use(authenticateJwt, requireAdmin);

router.post('/users', validate(createUserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await adminService.createUser(req.body);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await adminService.listUsers();
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.delete('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user as { userId: string };
    const result = await adminService.deleteUser(req.params.id as string, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
