import { Writable } from 'node:stream';
import express from 'express';
import pino from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createHttpLogger } from '../common/utils/http-logger';

function captureLogs() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  return { logger: pino(stream), lines };
}

describe('createHttpLogger', () => {
  it('redacta los headers con credenciales del request y el set-cookie de la respuesta', async () => {
    const { logger, lines } = captureLogs();
    const app = express();
    app.use(createHttpLogger(logger));
    app.get('/ping', (_req, res) => {
      res.cookie('refresh_token', 'refresh-de-la-respuesta');
      res.json({ ok: true });
    });

    await request(app)
      .get('/ping')
      .set('Authorization', 'Bearer access-del-request')
      .set('Cookie', 'refresh_token=refresh-del-request')
      .set('x-origin-secret', 'secreto-del-proxy');

    const entry = lines.map(line => JSON.parse(line)).find(log => log.req && log.res);
    expect(entry.req.headers.authorization).toBe('[Redacted]');
    expect(entry.req.headers.cookie).toBe('[Redacted]');
    expect(entry.req.headers['x-origin-secret']).toBe('[Redacted]');
    expect(entry.res.headers['set-cookie']).toBe('[Redacted]');
    const output = lines.join('\n');
    for (const secret of [
      'access-del-request',
      'refresh-del-request',
      'secreto-del-proxy',
      'refresh-de-la-respuesta',
    ]) {
      expect(output).not.toContain(secret);
    }
  });
});
