import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { ROTATION_GRACE_MS, hashRefreshToken } from '../../auth/auth.service';
import { prisma } from '../../common/db';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { createUser } from '../../test/integration/factories';
import { activeSessionCount, seedSession } from '../../test/integration/session';

const app = createIntegrationApp();

function refresh(refreshToken: string) {
  return request(app).post('/api/auth/refresh').send({ refreshToken });
}

/** Separado de `auth-session`: el limiter de refresh (20 por IP) vive en memoria por archivo. */
describe('rotación de refresh tokens (integración)', () => {
  it('rotar dos veces deja rechazado el primer token y su reuso revoca todas las sesiones', async () => {
    const user = await createUser();
    const first = await seedSession(user);

    const second = await refresh(first);
    expect(second.status).toBe(200);
    const third = await refresh(second.body.refreshToken as string);
    expect(third.status).toBe(200);

    const reused = await refresh(first);

    expect(reused.status).toBe(401);
    expect(await activeSessionCount(user.id)).toBe(0);
    expect((await refresh(third.body.refreshToken as string)).status).toBe(401);
  });

  it('dentro de la ventana de gracia acepta el token recién rotado sin revocar nada', async () => {
    const user = await createUser();
    const first = await seedSession(user);
    const rotated = await refresh(first);

    const retried = await refresh(first);

    expect(retried.status).toBe(200);
    expect(retried.body.refreshToken).not.toBe(rotated.body.refreshToken);
    expect(await activeSessionCount(user.id)).toBe(2);
    const original = await prisma.refreshToken.findUnique({ where: { tokenHash: hashRefreshToken(first) } });
    expect(original?.rotatedAt).toEqual(expect.any(Date));
    expect((await refresh(rotated.body.refreshToken as string)).status).toBe(200);
  });

  it('la gracia termina cuando se usa el sucesor, aunque no hayan pasado los 30 s', async () => {
    const user = await createUser();
    const first = await seedSession(user);
    const successor = await refresh(first);
    expect((await refresh(first)).status).toBe(200);

    expect((await refresh(successor.body.refreshToken as string)).status).toBe(200);
    const reused = await refresh(first);

    expect(reused.status).toBe(401);
    expect(await activeSessionCount(user.id)).toBe(0);
  });

  it('un token que ya no está en la base da 401 sin revocar las otras sesiones', async () => {
    const user = await createUser();
    const evicted = await seedSession(user);
    const other = await seedSession(user);
    await prisma.refreshToken.delete({ where: { tokenHash: hashRefreshToken(evicted) } });

    const res = await refresh(evicted);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('La sesión ya no es válida');
    expect((await refresh(other)).status).toBe(200);
  });

  it('un refresh en vuelo después del logout de otra pestaña no revoca las otras sesiones', async () => {
    const user = await createUser();
    const tab = await seedSession(user);
    const otherDevice = await seedSession(user);
    await request(app).post('/api/auth/logout').send({ refreshToken: tab });

    const res = await refresh(tab);

    expect(res.status).toBe(401);
    expect((await refresh(otherDevice)).status).toBe(200);
  });

  it('reusar el token dentro de la gracia no la extiende más allá de la creación del sucesor', async () => {
    const user = await createUser();
    const first = await seedSession(user);
    await refresh(first);
    expect((await refresh(first)).status).toBe(200);
    await prisma.refreshToken.updateMany({
      where: { previousTokenHash: hashRefreshToken(first) },
      data: { createdAt: new Date(Date.now() - ROTATION_GRACE_MS - 1000) },
    });

    const reused = await refresh(first);

    expect(reused.status).toBe(401);
    expect(await activeSessionCount(user.id)).toBe(0);
  });
});
