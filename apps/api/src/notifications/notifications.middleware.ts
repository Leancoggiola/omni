import type { NextFunction, Request, Response } from 'express';

import { authenticateJwt } from '../auth/middleware/auth.middleware';
import { resolveUserIdFromDeviceToken } from './notifications.service';

/** JWT (cookie/Bearer) or Raspberry Pi device API key. */
export async function authenticateNotifications(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer omni_pi_')) {
    const token = authHeader.slice('Bearer '.length);
    const userId = await resolveUserIdFromDeviceToken(token);
    if (!userId) {
      next({ status: 401, message: 'Device token inválido' });
      return;
    }
    req.user = { userId, username: '', role: 'USER' };
    next();
    return;
  }

  authenticateJwt(req, res, next);
}
