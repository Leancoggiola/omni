import type { Express } from 'express';
import { once } from 'node:events';
import type { Server } from 'node:http';

/**
 * Levanta la app en un puerto libre de 127.0.0.1 para pasarle el servidor a supertest. Si recibe la app suelta,
 * supertest escucha en todas las interfaces y le puede tocar un puerto que otro proceso ya usa en 127.0.0.1: el
 * request termina en ese proceso. El servidor queda con `unref`, así no hay que cerrarlo en cada test.
 */
export async function listenOnLoopback(app: Express): Promise<Server> {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.unref();
}
