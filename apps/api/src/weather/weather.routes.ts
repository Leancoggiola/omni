import { Router } from 'express';

import { currentWeatherQuerySchema } from '@omni/shared/weather';

import { authenticateJwt } from '../auth/middleware/auth.middleware';
import { createRateLimiter, validate } from '../common/utils';
import * as weatherService from './weather.service';

const weatherLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    statusCode: 429,
    message: 'Demasiadas consultas, intenta de nuevo más tarde',
  },
});

const router = Router();

router.use(authenticateJwt);

router.get('/current', weatherLimiter, validate(currentWeatherQuerySchema, 'query'), async (_req, res) => {
  res.json(await weatherService.getCurrentWeather());
});

export default router;
