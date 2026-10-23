import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '../app';

describe('createApp', () => {
  const app = createApp();

  it('monta helmet antes que las rutas', async () => {
    const res = await request(app).get('/api/no-existe');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('cierra /api con un 404 en JSON', async () => {
    const res = await request(app).get('/api/no-existe');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ statusCode: 404, message: 'Ruta no encontrada' });
  });

  it('marca las respuestas de /api como no-store', async () => {
    const res = await request(app).get('/api/no-existe');

    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('devuelve una app nueva en cada llamada', () => {
    expect(createApp()).not.toBe(app);
  });
});
