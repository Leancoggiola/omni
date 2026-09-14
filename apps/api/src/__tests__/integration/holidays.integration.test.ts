import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { authHeader } from '../../test/integration/auth';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { createUser, toJwtUser } from '../../test/integration/factories';

// La base es real; solo se fingen las llamadas salientes a Wikipedia.
vi.mock('../../holidays/wikipedia.service');

import { resetHolidaysCache } from '../../holidays/holidays.service';
import * as wikipediaService from '../../holidays/wikipedia.service';

const mockedWikipedia = vi.mocked(wikipediaService);

const app = createIntegrationApp();

describe('holidays routes (integration)', () => {
  let auth: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetHolidaysCache();
    mockedWikipedia.fetchHolidays.mockResolvedValue({
      holidays: [
        { text: 'Día Internacional del Chocolate.Celebración instaurada en 1995.' },
        { text: 'san Antero, papa (f. 236)' },
        { text: 'Australia Australia: Día de la Independencia' },
        { text: 'Argentina Argentina: Día del Bibliotecario' },
      ],
    });

    const user = await createUser({ username: 'holidays-reader' });
    auth = authHeader(toJwtUser(user));
  });

  it('devuelve 401 sin auth', async () => {
    const res = await request(app).get('/api/holidays/today');

    expect(res.status).toBe(401);
    expect(mockedWikipedia.fetchHolidays).not.toHaveBeenCalled();
  });

  it('GET /today devuelve solo efemérides civiles, con Argentina marcada', async () => {
    const res = await request(app).get('/api/holidays/today').set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.items).toEqual([
      { id: `${res.body.date}-0`, title: 'Día Internacional del Chocolate', isArgentina: false },
      { id: `${res.body.date}-3`, title: 'Día del Bibliotecario', isArgentina: true },
    ]);
    expect(res.body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.body.sourceUrl).toMatch(/^https:\/\/es\.wikipedia\.org\/wiki\/\d{1,2}_de_\w+#Celebraciones$/);
  });

  it('propaga el 404 de Wikipedia', async () => {
    mockedWikipedia.fetchHolidays.mockRejectedValue({
      status: 404,
      message: 'No hay efemérides para esta fecha',
    });

    const res = await request(app).get('/api/holidays/today').set('Authorization', auth);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ statusCode: 404, message: 'No hay efemérides para esta fecha' });
  });

  it('devuelve 502 cuando Wikipedia falla', async () => {
    mockedWikipedia.fetchHolidays.mockRejectedValue({ status: 502, message: 'Error de Wikipedia: Bad Gateway' });

    const res = await request(app).get('/api/holidays/today').set('Authorization', auth);

    expect(res.status).toBe(502);
  });

  it('sirve desde caché en la segunda request del mismo día', async () => {
    await request(app).get('/api/holidays/today').set('Authorization', auth);
    await request(app).get('/api/holidays/today').set('Authorization', auth);

    expect(mockedWikipedia.fetchHolidays).toHaveBeenCalledTimes(1);
  });
});
