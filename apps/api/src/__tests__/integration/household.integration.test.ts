import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { prisma } from '../../common/db';
import { authHeader } from '../../test/integration/auth';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import {
  createMediaItem,
  createPantryProduct,
  createShoppingListItem,
  createUser,
  householdIdOf,
  linkUsers,
  toJwtUser,
} from '../../test/integration/factories';

vi.mock('../../media/tmdb.service');

const app = createIntegrationApp();

type TestUser = Awaited<ReturnType<typeof createUser>>;

function as(user: TestUser) {
  return authHeader(toJwtUser(user));
}

async function invite(host: TestUser) {
  const res = await request(app).post('/api/household/invite').set('Authorization', as(host));
  expect(res.status).toBe(201);
  return res.body as { id: string; code: string; expiresAt: string };
}

async function accept(guest: TestUser, code: string) {
  return request(app).post('/api/household/invite/accept').set('Authorization', as(guest)).send({ code });
}

describe('household routes (integration)', () => {
  let ana: TestUser;
  let beto: TestUser;

  beforeEach(async () => {
    ana = await createUser({ username: 'ana', name: 'Ana' });
    beto = await createUser({ username: 'beto', name: 'Beto' });
  });

  describe('hogar propio', () => {
    it('requires auth', async () => {
      expect((await request(app).get('/api/household')).status).toBe(401);
    });

    it('cada cuenta nace con un hogar de un integrante y sin invitación', async () => {
      const res = await request(app).get('/api/household').set('Authorization', as(ana));

      expect(res.status).toBe(200);
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0]).toMatchObject({ userId: ana.id, name: 'Ana', username: 'ana' });
      expect(res.body.pendingInvite).toBeNull();
    });

    it('un usuario creado desde admin también recibe su hogar', async () => {
      const admin = await createUser({ username: 'root', role: 'ADMIN' });
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', as(admin))
        .send({ username: 'nuevo01', name: 'Nuevo', password: 'password123' });

      expect(res.status).toBe(201);
      expect(await prisma.householdMember.count({ where: { userId: res.body.user.id } })).toBe(1);
    });

    it('media y alacena de cada hogar no se ven entre sí', async () => {
      const item = await createMediaItem(ana.id);
      await createPantryProduct(ana.id, { name: 'Arroz' });

      const media = await request(app).get('/api/media/list').set('Authorization', as(beto));
      const pantry = await request(app).get('/api/pantry/products').set('Authorization', as(beto));
      const patch = await request(app)
        .patch(`/api/media/list/${item.id}`)
        .set('Authorization', as(beto))
        .send({ status: 'watched' });

      expect(media.body).toEqual([]);
      expect(pantry.body.items).toEqual([]);
      expect(patch.status).toBe(404);
    });
  });

  describe('invitación', () => {
    it('genera un código de un solo uso con 48 h de vigencia y guarda solo su hash', async () => {
      const before = Date.now();
      const created = await invite(ana);

      expect(created.code).toMatch(/^[A-Z2-9]{8}$/);
      const hours = (new Date(created.expiresAt).getTime() - before) / 3_600_000;
      expect(hours).toBeGreaterThan(47.9);
      expect(hours).toBeLessThanOrEqual(48.01);

      const stored = await prisma.householdInvite.findUniqueOrThrow({ where: { id: created.id } });
      expect(stored.codeHash).not.toContain(created.code);
      expect(JSON.stringify(stored)).not.toContain(created.code);

      const household = await request(app).get('/api/household').set('Authorization', as(ana));
      expect(household.body.pendingInvite).toEqual({ id: created.id, expiresAt: created.expiresAt });
      expect(JSON.stringify(household.body)).not.toContain(created.code);
    });

    it('un código nuevo revoca el pendiente anterior', async () => {
      const first = await invite(ana);
      const second = await invite(ana);

      expect((await accept(beto, first.code)).status).toBe(404);
      expect((await accept(beto, second.code)).status).toBe(200);
    });

    it('se puede revocar mientras está pendiente y después ya no', async () => {
      const created = await invite(ana);

      const revoke = await request(app).delete('/api/household/invite').set('Authorization', as(ana));
      expect(revoke.status).toBe(204);
      expect((await accept(beto, created.code)).status).toBe(404);

      const again = await request(app).delete('/api/household/invite').set('Authorization', as(ana));
      expect(again.status).toBe(404);
    });

    it('rechaza un código vencido, uno inexistente y uno con formato inválido', async () => {
      const created = await invite(ana);
      await prisma.householdInvite.update({
        where: { id: created.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      expect((await accept(beto, created.code)).status).toBe(404);
      expect((await accept(beto, 'ABCDEFGH')).status).toBe(404);
      expect((await accept(beto, 'corto')).status).toBe(400);
      expect(
        (await request(app).post('/api/household/invite/accept').set('Authorization', as(beto)).send({})).status
      ).toBe(400);
    });

    it('acepta el código sin importar mayúsculas, espacios ni guiones', async () => {
      const created = await invite(ana);
      const typed = `${created.code.slice(0, 4)}-${created.code.slice(4)}`.toLowerCase();

      expect((await accept(beto, typed)).status).toBe(200);
    });

    it('un código usado no sirve una segunda vez', async () => {
      const created = await invite(ana);
      const carla = await createUser({ username: 'carla' });

      expect((await accept(beto, created.code)).status).toBe(200);
      expect((await accept(carla, created.code)).status).toBe(404);
    });

    it('no se puede aceptar el código del propio hogar', async () => {
      const created = await invite(ana);
      const res = await accept(ana, created.code);

      expect(res.status).toBe(409);
    });

    it('un hogar completo no genera invitaciones ni admite una tercera persona', async () => {
      const created = await invite(ana);
      const carla = await createUser({ username: 'carla' });
      const second = await invite(carla);

      expect((await accept(beto, created.code)).status).toBe(200);

      const full = await request(app).post('/api/household/invite').set('Authorization', as(ana));
      expect(full.status).toBe(409);
      expect((await accept(ana, second.code)).status).toBe(409);
      expect(await prisma.householdMember.count({ where: { householdId: await householdIdOf(ana.id) } })).toBe(2);
    });

    it('quien ya está vinculado no puede unirse a otro hogar', async () => {
      await linkUsers(ana.id, beto.id);
      const carla = await createUser({ username: 'carla' });
      const code = await invite(carla);

      expect((await accept(beto, code.code)).status).toBe(409);
    });
  });

  describe('vista previa y unión', () => {
    async function seedBoth() {
      await createMediaItem(ana.id, { tmdbId: 10, title: 'Repetida', status: 'watched' });
      await createMediaItem(ana.id, { tmdbId: 11, title: 'Solo de Ana' });
      await createMediaItem(beto.id, { tmdbId: 10, title: 'Repetida', status: 'to_watch' });
      await createMediaItem(beto.id, { tmdbId: 12, mediaType: 'tv', title: 'Solo de Beto' });

      const anaMilk = await createPantryProduct(ana.id, { name: 'Leche', quantity: 3 });
      await createPantryProduct(ana.id, { name: 'Arroz', quantity: 2 });
      const betoMilk = await createPantryProduct(beto.id, { name: 'Leche', quantity: 9 });
      await createPantryProduct(beto.id, { name: 'Fideos', quantity: 4 });

      await createShoppingListItem(ana.id, { name: 'Leche', pantryProductId: anaMilk.id, source: 'MANUAL' });
      await createShoppingListItem(beto.id, { name: 'Leche', pantryProductId: betoMilk.id, source: 'AUTO' });
      await createShoppingListItem(beto.id, { name: 'Pan' });
      return { anaMilk, betoMilk };
    }

    it('muestra qué aporta quien acepta y los conflictos, sin cambiar nada', async () => {
      await seedBoth();
      const created = await invite(ana);

      const res = await request(app)
        .post('/api/household/invite/preview')
        .set('Authorization', as(beto))
        .send({ code: created.code });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        inviter: { name: 'Ana' },
        contributes: { mediaCount: 2, pantryProductCount: 2, shoppingItemCount: 2 },
        conflicts: {
          media: [{ tmdbId: 10, mediaType: 'movie', title: 'Repetida' }],
          pantry: [{ name: 'Leche' }],
        },
      });
      expect(await prisma.householdMember.count({ where: { householdId: await householdIdOf(ana.id) } })).toBe(1);
      expect(await prisma.mediaItem.count({ where: { createdById: beto.id } })).toBe(2);
    });

    it('la vista previa rechaza códigos inválidos', async () => {
      const res = await request(app)
        .post('/api/household/invite/preview')
        .set('Authorization', as(beto))
        .send({ code: 'ABCDEFGH' });

      expect(res.status).toBe(404);
    });

    it('une los datos y deja el registro del hogar que recibe en los repetidos', async () => {
      const { anaMilk } = await seedBoth();
      const created = await invite(ana);

      const res = await accept(beto, created.code);

      expect(res.status).toBe(200);
      expect(res.body.members.map((m: { userId: string }) => m.userId).sort()).toEqual([ana.id, beto.id].sort());
      expect(res.body.pendingInvite).toBeNull();
      expect(await householdIdOf(beto.id)).toBe(await householdIdOf(ana.id));

      const media = await request(app).get('/api/media/list').set('Authorization', as(beto));
      const byTmdb = Object.fromEntries(
        media.body.map((m: { tmdbId: number; status: string }) => [m.tmdbId, m.status])
      );
      expect(byTmdb).toEqual({ 10: 'watched', 11: 'to_watch', 12: 'to_watch' });
      expect(media.body.find((m: { tmdbId: number }) => m.tmdbId === 10).createdById).toBe(ana.id);

      const pantry = await request(app).get('/api/pantry/products?limit=50').set('Authorization', as(ana));
      const quantities = Object.fromEntries(
        pantry.body.items.map((p: { name: string; quantity: number }) => [p.name, p.quantity])
      );
      expect(quantities).toEqual({ Leche: 3, Arroz: 2, Fideos: 4 });

      const shopping = await request(app).get('/api/pantry/shopping-list').set('Authorization', as(ana));
      const names = shopping.body.map((i: { name: string }) => i.name).sort();
      expect(names).toEqual(['Leche', 'Pan']);
      expect(shopping.body.find((i: { name: string }) => i.name === 'Leche').pantryProductId).toBe(anaMilk.id);
    });

    it('lo que agrega uno lo ve el otro, con su autoría', async () => {
      await linkUsers(ana.id, beto.id);

      const added = await request(app)
        .post('/api/pantry/products')
        .set('Authorization', as(beto))
        .send({ name: 'Yerba', category: 'GRAINS', unit: 'PACKAGES', quantity: 2 });
      const seen = await request(app).get(`/api/pantry/products/${added.body.id}`).set('Authorization', as(ana));
      const edited = await request(app)
        .patch(`/api/pantry/products/${added.body.id}`)
        .set('Authorization', as(ana))
        .send({ quantity: 7 });

      expect(seen.status).toBe(200);
      expect(seen.body.createdById).toBe(beto.id);
      expect(edited.body.quantity).toBe(7);
    });
  });

  describe('desvincular', () => {
    it('no se puede si no hay otra persona', async () => {
      const res = await request(app).post('/api/household/leave').set('Authorization', as(ana));

      expect(res.status).toBe(409);
    });

    it('quien se va recibe una copia y quien se queda conserva todo', async () => {
      await linkUsers(ana.id, beto.id);
      const milk = await createPantryProduct(ana.id, { name: 'Leche', quantity: 3 });
      await createPantryProduct(beto.id, { name: 'Arroz', quantity: 2 });
      await createMediaItem(ana.id, { tmdbId: 10, status: 'watched' });
      await createShoppingListItem(beto.id, { name: 'Leche', pantryProductId: milk.id });
      const sharedHousehold = await householdIdOf(ana.id);

      const res = await request(app).post('/api/household/leave').set('Authorization', as(beto));

      expect(res.status).toBe(200);
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].userId).toBe(beto.id);
      expect(await householdIdOf(beto.id)).not.toBe(sharedHousehold);
      expect(await householdIdOf(ana.id)).toBe(sharedHousehold);

      const betoMedia = await request(app).get('/api/media/list').set('Authorization', as(beto));
      const betoPantry = await request(app).get('/api/pantry/products?limit=50').set('Authorization', as(beto));
      const betoShopping = await request(app).get('/api/pantry/shopping-list').set('Authorization', as(beto));
      expect(betoMedia.body).toHaveLength(1);
      expect(betoMedia.body[0]).toMatchObject({ tmdbId: 10, status: 'watched', createdById: ana.id });
      expect(betoPantry.body.items.map((p: { name: string }) => p.name).sort()).toEqual(['Arroz', 'Leche']);
      expect(betoShopping.body[0].linkedProduct.name).toBe('Leche');
      expect(betoShopping.body[0].pantryProductId).not.toBe(milk.id);

      const anaPantry = await request(app).get('/api/pantry/products?limit=50').set('Authorization', as(ana));
      expect(anaPantry.body.items).toHaveLength(2);
      expect((await request(app).get('/api/media/list').set('Authorization', as(ana))).body).toHaveLength(1);
    });

    it('después de desvincular, los cambios de uno no afectan al otro', async () => {
      await linkUsers(ana.id, beto.id);
      const item = await createMediaItem(ana.id, { tmdbId: 10 });
      await request(app).post('/api/household/leave').set('Authorization', as(ana));

      await request(app).delete(`/api/media/list/${item.id}`).set('Authorization', as(beto));

      const mine = await request(app).get('/api/media/list').set('Authorization', as(ana));
      expect(mine.body).toHaveLength(1);
    });

    it('cualquiera de los dos puede desvincular y volver a vincularse con otra persona', async () => {
      await linkUsers(ana.id, beto.id);
      const carla = await createUser({ username: 'carla' });

      expect((await request(app).post('/api/household/leave').set('Authorization', as(ana))).status).toBe(200);
      const created = await invite(carla);
      expect((await accept(ana, created.code)).status).toBe(200);
      expect(await prisma.householdMember.count({ where: { householdId: await householdIdOf(beto.id) } })).toBe(1);
    });
  });

  describe('borrar la cuenta', () => {
    it('estando vinculada equivale a desvincular: la otra persona conserva todo', async () => {
      await linkUsers(ana.id, beto.id);
      const item = await createMediaItem(beto.id, { tmdbId: 10 });
      const householdId = await householdIdOf(ana.id);

      const res = await request(app).delete('/api/users/account').set('Authorization', as(beto));

      expect(res.status).toBe(200);
      expect(await prisma.user.count({ where: { id: beto.id } })).toBe(0);
      expect(await prisma.household.count({ where: { id: householdId } })).toBe(1);
      const kept = await prisma.mediaItem.findUniqueOrThrow({ where: { id: item.id } });
      expect(kept.householdId).toBe(householdId);
      expect(kept.createdById).toBeNull();
      expect((await request(app).get('/api/media/list').set('Authorization', as(ana))).body).toHaveLength(1);
    });

    it('si era la única persona del hogar, el hogar y sus datos se eliminan', async () => {
      const householdId = await householdIdOf(ana.id);
      await createMediaItem(ana.id);
      await createPantryProduct(ana.id);

      const res = await request(app).delete('/api/users/account').set('Authorization', as(ana));

      expect(res.status).toBe(200);
      expect(await prisma.household.count({ where: { id: householdId } })).toBe(0);
      expect(await prisma.mediaItem.count({ where: { householdId } })).toBe(0);
      expect(await prisma.pantryProduct.count({ where: { householdId } })).toBe(0);
    });

    it('admin eliminando a una persona vinculada tampoco borra los datos compartidos', async () => {
      await linkUsers(ana.id, beto.id);
      await createMediaItem(ana.id);
      const admin = await createUser({ username: 'root', role: 'ADMIN' });

      const res = await request(app).delete(`/api/admin/users/${ana.id}`).set('Authorization', as(admin));

      expect(res.status).toBe(200);
      expect((await request(app).get('/api/media/list').set('Authorization', as(beto))).body).toHaveLength(1);
    });
  });
});
