import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import { AMOUNT_MAX_10_2, AMOUNT_MAX_12_2 } from '@omni/shared/common';

import { config } from '../../config';
import { prisma } from '../../common/db';
import { authHeader } from '../../test/integration/auth';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { TEST_PASSWORD, createPantryProduct, createUser, toJwtUser } from '../../test/integration/factories';
import { withSavepoint } from '../../test/integration/withSavepoint';

vi.mock('../../media/tmdb.service');

import * as tmdbService from '../../media/tmdb.service';

const mockedTmdb = vi.mocked(tmdbService);

const app = createIntegrationApp();

const movieDetail = {
  id: 550,
  title: 'Fight Club',
  poster_path: '/poster.jpg',
} as unknown as Awaited<ReturnType<typeof tmdbService.getMovieDetail>>;

describe('errores de entrada (integration)', () => {
  let user: Awaited<ReturnType<typeof createUser>>;
  let auth: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockedTmdb.getMovieDetail.mockResolvedValue(movieDetail);
    user = await createUser({ username: 'inputerrors' });
    auth = authHeader(toJwtUser(user));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('errores de Prisma', () => {
    it('P2002: un alta que pierde la carrera contra otra igual responde 409', async () => {
      const item = await prisma.mediaItem.create({
        data: { userId: user.id, tmdbId: 550, mediaType: 'movie', title: 'Fight Club', status: 'to_watch' },
      });
      vi.spyOn(prisma.mediaItem, 'findUnique').mockResolvedValueOnce(null);

      const res = await withSavepoint(() =>
        request(app).post('/api/media/list').set('Authorization', auth).send({ tmdbId: 550, mediaType: 'movie' })
      );

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ statusCode: 409, message: expect.any(String) });
      expect(res.body.message).not.toMatch(/prisma|constraint|userId/i);
      expect(item.id).toEqual(expect.any(String));
    });

    it('P2025: un registro que desaparece entre la lectura y la escritura responde 404', async () => {
      const item = await prisma.mediaItem.create({
        data: { userId: user.id, tmdbId: 551, mediaType: 'movie', title: 'Otra', status: 'to_watch' },
      });
      await prisma.mediaItem.delete({ where: { id: item.id } });
      vi.spyOn(prisma.mediaItem, 'findFirst').mockResolvedValueOnce(item);

      const res = await request(app)
        .patch(`/api/media/list/${item.id}`)
        .set('Authorization', auth)
        .send({ status: 'watched' });

      expect(res.status).toBe(404);
      expect(res.body.statusCode).toBe(404);
    });

    it('P2003: una referencia que dejó de existir responde 400', async () => {
      const product = await createPantryProduct(user.id, { name: 'Leche' });
      await prisma.pantryProduct.delete({ where: { id: product.id } });
      vi.spyOn(prisma.pantryProduct, 'findFirst').mockResolvedValueOnce(product);

      const res = await withSavepoint(() =>
        request(app)
          .post('/api/pantry/shopping-list/items')
          .set('Authorization', auth)
          .send({ pantryProductId: product.id, quantityToBuy: 2 })
      );

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
    });
  });

  describe('parámetros de ruta', () => {
    const longId = 'a'.repeat(65);

    it.each([
      ['PATCH', `/api/media/list/${longId}`, { status: 'watched' }],
      ['DELETE', `/api/media/list/${longId}`, undefined],
      ['DELETE', `/api/notifications/devices/${longId}`, undefined],
      ['DELETE', `/api/admin/users/${longId}`, undefined],
      ['PATCH', `/api/split-expenses/friends/${longId}`, { name: 'Ana' }],
      ['DELETE', `/api/split-expenses/friends/${longId}`, undefined],
      ['GET', `/api/split-expenses/gatherings/${longId}`, undefined],
      ['DELETE', `/api/split-expenses/gatherings/${longId}/expenses/${longId}`, undefined],
      ['GET', `/api/pantry/products/${longId}`, undefined],
      ['DELETE', `/api/pantry/shopping-list/items/${longId}`, undefined],
      ['GET', `/api/gym/plans/${longId}`, undefined],
      ['POST', `/api/gym/plans/${longId}/archive`, undefined],
      ['DELETE', `/api/gym/exercises/${longId}`, undefined],
      ['PATCH', `/api/expenses/reminders/${longId}`, { title: 'Luz' }],
      ['DELETE', `/api/expenses/${longId}`, undefined],
    ] as const)('%s %s con un id desmedido responde 400 sin tocar la base', async (method, path, body) => {
      const admin = await createUser({ username: 'paramsadmin', role: 'ADMIN' });
      const adminAuth = authHeader(toJwtUser(admin));

      const req = request(app)[method.toLowerCase() as 'get'](path).set('Authorization', adminAuth);
      const res = await (body ? req.send(body) : req);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Error de validación');
    });

    it('un id bien formado que no existe sigue respondiendo 404', async () => {
      const res = await request(app).delete('/api/media/list/no-existe').set('Authorization', auth);

      expect(res.status).toBe(404);
    });
  });

  describe('importes y fechas', () => {
    const expense = { concept: 'Luz', amount: 100, category: 'HOME', date: '2026-02-20' };

    it('rechaza un importe de 1e15 con 400 en lugar de 500', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', auth)
        .send({ ...expense, amount: 1e15 });

      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveProperty('amount');
    });

    it('rechaza la fecha 2026-02-31 en lugar de correrla al 3 de marzo', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', auth)
        .send({ ...expense, date: '2026-02-31' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveProperty('date');
      expect(await prisma.personalExpense.count({ where: { userId: user.id } })).toBe(0);
    });

    it('guarda el importe máximo de Decimal(12,2)', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', auth)
        .send({ ...expense, amount: AMOUNT_MAX_12_2 });

      expect(res.status).toBe(201);
    });

    it('guarda la cantidad máxima de Decimal(10,2) en la despensa', async () => {
      const res = await request(app)
        .post('/api/pantry/products')
        .set('Authorization', auth)
        .send({ name: 'Arroz', category: 'GRAINS', unit: 'PACKAGES', quantity: AMOUNT_MAX_10_2 });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /media/tmdb/:type/:id', () => {
    it('ya no existe', async () => {
      const res = await request(app).get('/api/media/tmdb/movie/550').set('Authorization', auth);

      expect(res.status).toBe(404);
    });
  });

  describe('algoritmo de los JWT', () => {
    function unsignedToken(payload: object): string {
      const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
      return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
    }

    it('acepta un access token HS256', async () => {
      const res = await request(app).get('/api/users/profile').set('Authorization', auth);

      expect(res.status).toBe(200);
    });

    it('rechaza un access token firmado con otro algoritmo, aunque el secreto sea el correcto', async () => {
      const token = jwt.sign({ sub: user.id, username: user.username, role: user.role }, config.jwt.accessSecret, {
        algorithm: 'HS384',
        expiresIn: '15m',
      });

      const res = await request(app).get('/api/users/profile').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });

    it('rechaza un access token sin firma (alg none)', async () => {
      const token = unsignedToken({ sub: user.id, username: user.username, role: user.role });

      const res = await request(app).get('/api/users/profile').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });

    it('rechaza un refresh token firmado con otro algoritmo', async () => {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ username: 'inputerrors', password: TEST_PASSWORD });
      const forged = jwt.sign({ sub: user.id }, config.jwt.refreshSecret, { algorithm: 'HS384', expiresIn: '7d' });

      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: forged });

      expect(login.status).toBe(200);
      expect(res.status).toBe(401);
    });
  });

  describe('login', () => {
    it('responde igual ante un usuario inexistente que ante una contraseña incorrecta', async () => {
      const unknown = await request(app)
        .post('/api/auth/login')
        .send({ username: 'noexiste1', password: 'cualquiera' });
      const wrong = await request(app)
        .post('/api/auth/login')
        .send({ username: 'inputerrors', password: 'incorrecta' });

      expect(unknown.status).toBe(401);
      expect(wrong.status).toBe(401);
      expect(unknown.body).toEqual(wrong.body);
    });

    it('toma la vigencia de las cookies y del refresh token de la misma configuración', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: 'inputerrors', password: TEST_PASSWORD });

      const cookies = res.headers['set-cookie'] as unknown as string[];
      const maxAge = (name: string) => {
        const cookie = cookies.find(c => c.startsWith(`${name}=`) && /Max-Age=[1-9]/.test(c));
        return Number(/Max-Age=(\d+)/.exec(cookie ?? '')?.[1]);
      };
      expect(maxAge('access_token')).toBe(config.jwt.accessTtlMs / 1000);
      expect(maxAge('refresh_token')).toBe(config.jwt.refreshTtlMs / 1000);

      const stored = await prisma.refreshToken.findFirstOrThrow({ where: { userId: user.id } });
      expect(stored.expiresAt.getTime() - Date.now()).toBeGreaterThan(config.jwt.refreshTtlMs - 60_000);
      expect(stored.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(config.jwt.refreshTtlMs);
    });
  });

  describe('guards', () => {
    it('requireAdmin responde 403 con el formato de error estándar', async () => {
      const res = await request(app).get('/api/admin/users').set('Authorization', auth);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ statusCode: 403, message: 'Acceso denegado: se requiere rol ADMIN' });
    });

    it('authenticateNotifications rechaza un JWT inválido con el formato de error estándar', async () => {
      const res = await request(app).get('/api/notifications/digest').set('Authorization', 'Bearer no-es-un-jwt');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ statusCode: 401, message: expect.any(String) });
    });

    it('authenticateNotifications acepta un JWT en la cookie de acceso', async () => {
      const token = authHeader(toJwtUser(user)).replace('Bearer ', '');

      const res = await request(app).get('/api/notifications/digest').set('Cookie', `access_token=${token}`);

      expect(res.status).toBe(200);
    });
  });
});
