import { Router } from 'express';

import { currentWeatherBodySchema } from '@omni/shared/weather';
import type { WeatherCoordinates } from '@omni/shared/weather';

import { authenticateJwt } from '../auth/middleware/auth.middleware';
import { createRateLimiter, validate } from '../common/utils';
import * as weatherService from './weather.service';

const weatherLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    statusCode: 429,
    message: 'Demasiadas consultas, intentá de nuevo más tarde',
  },
});

const router = Router();

router.use(authenticateJwt);

router.post('/current', weatherLimiter, validate(currentWeatherBodySchema), async (req, res) => {
  res.json(await weatherService.getCurrentWeather(req.body as WeatherCoordinates));
});

export default router;
