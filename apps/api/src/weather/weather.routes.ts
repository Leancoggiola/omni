import { Router } from 'express';

import { currentWeatherQuerySchema } from '@omni/shared/weather';
import type { WeatherCoordinates } from '@omni/shared/weather';

import { authenticateJwt } from '../auth/middleware/auth.middleware';
import { validatedQuery } from '../common/http';
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

router.get('/current', weatherLimiter, validate(currentWeatherQuerySchema, 'query'), async (req, res) => {
  res.json(await weatherService.getCurrentWeather(validatedQuery<WeatherCoordinates>(req)));
});

export default router;
