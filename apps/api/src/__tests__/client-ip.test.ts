import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Request, Response } from 'express';

import { clientIpKey, getClientIp } from '../common/utils/client-ip';
import { createOriginGuard, ORIGIN_SECRET_HEADER } from '../common/utils/origin-guard';
import { createRateLimiter } from '../common/utils/rate-limit';

function mockReq(headers: Record<string, string>, ip = '10.0.0.1'): Request {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    ip,
    socket: { remoteAddress: ip },
    get: (name: string) => lower[name.toLowerCase()],
  } as unknown as Request;
}

function mockRes(viaProxy?: boolean): Response {
  return { locals: viaProxy ? { viaProxy } : {} } as unknown as Response;
}

describe('getClientIp', () => {
  it('usa x-real-ip cuando el request vino del proxy', () => {
    const req = mockReq({ 'x-real-ip': '203.0.113.7' });

    expect(getClientIp(req, mockRes(true))).toBe('203.0.113.7');
  });

  it('ignora x-real-ip si el request no pasó el guard', () => {
    const req = mockReq({ 'x-real-ip': '203.0.113.7' });

    expect(getClientIp(req, mockRes())).toBe('10.0.0.1');
  });

  it('cae a req.ip si el proxy no mandó x-real-ip', () => {
    expect(getClientIp(mockReq({}), mockRes(true))).toBe('10.0.0.1');
  });
});

describe('clientIpKey', () => {
  it('deja las IPv4 tal cual', () => {
    expect(clientIpKey(mockReq({}, '198.51.100.4'), mockRes())).toBe('198.51.100.4');
  });

  it('agrupa las IPv6 de la misma subred en una sola clave', () => {
    const a = clientIpKey(mockReq({ 'x-real-ip': '2001:db8:abcd:12::1' }), mockRes(true));
    const b = clientIpKey(mockReq({ 'x-real-ip': '2001:db8:abcd:12::ffff' }), mockRes(true));

    expect(a).toBe(b);
    expect(a).not.toBe('2001:db8:abcd:12::1');
  });
});

describe('rate limit detrás del origin guard', () => {
  const SECRET = 'proxy-secret-de-prueba';

  function buildApp(secret: string | undefined) {
    const app = express();
    app.use(createOriginGuard(secret));
    app.use(createRateLimiter({ windowMs: 60_000, max: 1 }));
    app.get('/probe', (_req, res) => {
      res.json({ ok: true });
    });
    return app;
  }

  it('cuenta por x-real-ip cuando el request vino del proxy', async () => {
    const app = buildApp(SECRET);

    const first = await request(app).get('/probe').set(ORIGIN_SECRET_HEADER, SECRET).set('x-real-ip', '203.0.113.1');
    const other = await request(app).get('/probe').set(ORIGIN_SECRET_HEADER, SECRET).set('x-real-ip', '203.0.113.2');
    const repeat = await request(app).get('/probe').set(ORIGIN_SECRET_HEADER, SECRET).set('x-real-ip', '203.0.113.1');

    expect(first.status).toBe(200);
    expect(other.status).toBe(200);
    expect(repeat.status).toBe(429);
  });

  it('un x-real-ip inventado sin pasar por el proxy no esquiva el límite', async () => {
    const app = buildApp(undefined);

    const first = await request(app).get('/probe').set('x-real-ip', '203.0.113.1');
    const spoofed = await request(app).get('/probe').set('x-real-ip', '203.0.113.2');

    expect(first.status).toBe(200);
    expect(spoofed.status).toBe(429);
  });
});
