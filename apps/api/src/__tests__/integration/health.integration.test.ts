import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { createIntegrationApp } from '../../test/integration/createIntegrationApp';

vi.mock('../../common/db/check-database');

import * as checkDatabase from '../../common/db/check-database';

const mockedCheckDatabase = vi.mocked(checkDatabase);

const app = createIntegrationApp();

describe('health routes (integration)', () => {
  beforeEach(async () => {
    const actual = await vi.importActual<typeof checkDatabase>('../../common/db/check-database');
    mockedCheckDatabase.checkDatabaseConnection.mockReset();
    mockedCheckDatabase.checkDatabaseConnection.mockImplementation(actual.checkDatabaseConnection);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('GET /api/health responde sin auth, sin tocar la base y sin cachear', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', commit: null });
    expect(res.headers['cache-control']).toBe('no-store');
    expect(mockedCheckDatabase.checkDatabaseConnection).not.toHaveBeenCalled();
  });

  it('GET /api/health informa el commit que deployó Render', async () => {
    vi.stubEnv('RENDER_GIT_COMMIT', 'abc1234');

    const res = await request(app).get('/api/health');

    expect(res.body).toEqual({ status: 'ok', commit: 'abc1234' });
  });

  it('GET /api/health/ready hace SELECT 1 contra la base real', async () => {
    const res = await request(app).get('/api/health/ready');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'ok', commit: null });
    expect(mockedCheckDatabase.checkDatabaseConnection).toHaveBeenCalledTimes(1);
  });

  it('GET /api/health/ready devuelve 503 si la base no responde', async () => {
    mockedCheckDatabase.checkDatabaseConnection.mockResolvedValue(false);

    const res = await request(app).get('/api/health/ready');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'error', db: 'error', commit: null });
  });

  it('las rutas de la API también salen con no-store', async () => {
    const res = await request(app).get('/api/users/profile');

    expect(res.status).toBe(401);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});
