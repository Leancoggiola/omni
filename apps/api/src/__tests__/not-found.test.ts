import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';

import { apiNotFound } from '../common/utils/not-found';
import { errorHandler } from '../common/utils/error-handler';

function buildApp() {
  const app = express();
  app.get('/api/existe', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api', apiNotFound);
  app.use(errorHandler);
  return app;
}

describe('apiNotFound', () => {
  it('responde 404 en JSON con el formato del errorHandler', async () => {
    const res = await request(buildApp()).post('/api/no-existe?x=1');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ statusCode: 404, message: 'Ruta no encontrada' });
  });

  it('no intercepta las rutas que existen', async () => {
    const res = await request(buildApp()).get('/api/existe');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
