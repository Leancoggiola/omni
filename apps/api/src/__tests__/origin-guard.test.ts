import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';

import { createOriginGuard, ORIGIN_SECRET_HEADER } from '../common/utils/origin-guard';

const SECRET = 'proxy-secret-de-prueba';

function buildApp(secret: string | undefined) {
  const app = express();
  app.use(createOriginGuard(secret));
  app.get('/probe', (_req, res) => {
    res.json({ viaProxy: res.locals.viaProxy ?? false });
  });
  return app;
}

describe('origin guard', () => {
  it('sin secreto configurado deja pasar todo y no marca el request', async () => {
    const res = await request(buildApp(undefined)).get('/probe');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ viaProxy: false });
  });

  it('con el header correcto deja pasar y marca viaProxy', async () => {
    const res = await request(buildApp(SECRET)).get('/probe').set(ORIGIN_SECRET_HEADER, SECRET);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ viaProxy: true });
  });

  it('devuelve 403 si falta el header', async () => {
    const res = await request(buildApp(SECRET)).get('/probe');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ statusCode: 403, message: 'Acceso no permitido' });
  });

  it('devuelve 403 con un secreto incorrecto del mismo largo', async () => {
    const wrong = 'x'.repeat(SECRET.length);
    const res = await request(buildApp(SECRET)).get('/probe').set(ORIGIN_SECRET_HEADER, wrong);

    expect(res.status).toBe(403);
  });

  it('devuelve 403 con un secreto de otro largo sin tirar', async () => {
    const short = await request(buildApp(SECRET)).get('/probe').set(ORIGIN_SECRET_HEADER, 'corto');
    const long = await request(buildApp(SECRET)).get('/probe').set(ORIGIN_SECRET_HEADER, `${SECRET}-con-sufijo`);

    expect(short.status).toBe(403);
    expect(long.status).toBe(403);
  });
});
