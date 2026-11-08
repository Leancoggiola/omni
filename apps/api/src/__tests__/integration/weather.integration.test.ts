import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { API_PATHS, buildQueryString } from '@omni/shared/api';
import { currentWeatherSchema } from '@omni/shared/weather';

import { authHeader } from '../../test/integration/auth';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { createUser, toJwtUser } from '../../test/integration/factories';

vi.mock('../../weather/open-meteo.service');
vi.mock('../../weather/nominatim.service');

import * as nominatimService from '../../weather/nominatim.service';
import * as openMeteoService from '../../weather/open-meteo.service';
import { resetWeatherCache } from '../../weather/weather.service';

const mockedOpenMeteo = vi.mocked(openMeteoService);
const mockedNominatim = vi.mocked(nominatimService);

const app = createIntegrationApp();
const CURRENT_URL = `${API_PATHS.weather.current}${buildQueryString({ latitude: -34.61, longitude: -58.38 })}`;

describe('weather routes (integration)', () => {
  let auth: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetWeatherCache();
    mockedOpenMeteo.fetchWeather.mockResolvedValue({
      temperature: 22,
      condition: 'cloudy',
      isDay: true,
      min: 14,
      max: 26,
    });
    mockedNominatim.fetchCityName.mockResolvedValue('Buenos Aires');

    const user = await createUser({ username: 'weather-reader' });
    auth = authHeader(toJwtUser(user));
  });

  it('devuelve 401 sin auth', async () => {
    const res = await request(app).get(CURRENT_URL);

    expect(res.status).toBe(401);
    expect(mockedOpenMeteo.fetchWeather).not.toHaveBeenCalled();
  });

  it('GET /current cumple el contrato compartido', async () => {
    const res = await request(app).get(CURRENT_URL).set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(currentWeatherSchema.safeParse(res.body).success).toBe(true);
    expect(res.body).toMatchObject({ city: 'Buenos Aires', temperature: 22, condition: 'cloudy', stale: false });
  });

  it('entrega las coordenadas al proveedor como números', async () => {
    await request(app).get(CURRENT_URL).set('Authorization', auth);

    expect(mockedOpenMeteo.fetchWeather).toHaveBeenCalledWith({ latitude: -34.61, longitude: -58.38 });
  });

  it.each([
    ['sin coordenadas', API_PATHS.weather.current],
    ['con coordenadas exactas', `${API_PATHS.weather.current}?latitude=-34.603722&longitude=-58.381592`],
    ['fuera de rango', `${API_PATHS.weather.current}?latitude=-91&longitude=-58.38`],
  ])('devuelve 400 %s', async (_case, url) => {
    const res = await request(app).get(url).set('Authorization', auth);

    expect(res.status).toBe(400);
    expect(mockedOpenMeteo.fetchWeather).not.toHaveBeenCalled();
  });

  it('sirve desde caché en la segunda request', async () => {
    await request(app).get(CURRENT_URL).set('Authorization', auth);
    await request(app).get(CURRENT_URL).set('Authorization', auth);

    expect(mockedOpenMeteo.fetchWeather).toHaveBeenCalledTimes(1);
  });

  it('devuelve el error del proveedor si no hay dato guardado', async () => {
    mockedOpenMeteo.fetchWeather.mockRejectedValue({ status: 504, message: 'Open-Meteo no respondió a tiempo' });

    const res = await request(app).get(CURRENT_URL).set('Authorization', auth);

    expect(res.status).toBe(504);
  });
});
