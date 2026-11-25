import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { listenOnLoopback } from '../test/listenOnLoopback';

describe('listenOnLoopback', () => {
  it('escucha solo en 127.0.0.1 y supertest usa ese servidor', async () => {
    const app = express();
    app.get('/ping', (req, res) => {
      res.json({ port: req.socket.localPort });
    });

    const server = await listenOnLoopback(app);
    const res = await request(server).get('/ping');

    expect(server.address()).toMatchObject({ address: '127.0.0.1' });
    expect(server.address()).toMatchObject({ port: res.body.port });
    server.close();
  });
});
