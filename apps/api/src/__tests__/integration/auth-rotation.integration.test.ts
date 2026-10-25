import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { MAX_GRACE_SIBLINGS, ROTATION_GRACE_MS, hashRefreshToken } from '../../auth/auth.service';
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

  it('la gracia se mide desde la rotación: pasada, no suma hermanas sino que reemplaza las que nadie usó', async () => {
    const user = await createUser();
    const first = await seedSession(user);
    await refresh(first);
    expect((await refresh(first)).status).toBe(200);
    await prisma.refreshToken.update({
      where: { tokenHash: hashRefreshToken(first) },
      data: { rotatedAt: new Date(Date.now() - ROTATION_GRACE_MS - 1000) },
    });

    const replaced = await refresh(first);

    expect(replaced.status).toBe(200);
    expect(await activeSessionCount(user.id)).toBe(1);
    expect(await prisma.refreshToken.count({ where: { previousTokenHash: hashRefreshToken(first) } })).toBe(1);
  });

  it('después de MAX_GRACE_SIBLINGS hermanas da 401 sin revocar ni borrar las cookies', async () => {
    const user = await createUser();
    const first = await seedSession(user);
    const successor = await refresh(first);
    for (let index = 0; index < MAX_GRACE_SIBLINGS; index += 1) {
      expect((await refresh(first)).status).toBe(200);
    }

    const exhausted = await refresh(first);

    expect(exhausted.status).toBe(401);
    expect(exhausted.headers['set-cookie']).toBeUndefined();
    expect(await activeSessionCount(user.id)).toBe(1 + MAX_GRACE_SIBLINGS);
    expect((await refresh(successor.body.refreshToken as string)).status).toBe(200);
  });
});
