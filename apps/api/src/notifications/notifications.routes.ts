import { Router } from 'express';
import { idParamsSchema } from '@omni/shared/common';
import type { NextFunction, Request, Response } from 'express';
import { registerNotificationDeviceSchema } from '@omni/shared/notifications';
import { authenticateJwt } from '../auth/middleware/auth.middleware';
import { validate } from '../common/utils';
import { authenticateNotifications } from './notifications.middleware';
import { getDigestForUser, listDevices, registerDevice, deleteDevice } from './notifications.service';

const router = Router();

router.get('/digest', authenticateNotifications, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user as { userId: string };
    res.json(await getDigestForUser(userId));
  } catch (err) {
    next(err);
  }
});

router.get('/devices', authenticateJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user as { userId: string };
    res.json(await listDevices(userId));
  } catch (err) {
    next(err);
  }
});

router.post(
  '/devices',
  authenticateJwt,
  validate(registerNotificationDeviceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user as { userId: string };
      res.status(201).json(await registerDevice(userId, req.body));
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/devices/:deviceId',
  validate(idParamsSchema('deviceId'), 'params'),
  authenticateJwt,
  async (req, res, next) => {
    try {
      const { userId } = req.user as { userId: string };
      await deleteDevice(userId, req.params.deviceId as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
