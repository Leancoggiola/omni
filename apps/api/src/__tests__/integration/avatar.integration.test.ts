import request from 'supertest';
import { AVATAR_FIELD, AVATAR_MAX_BYTES, avatarResponseSchema } from '@omni/shared/users';
import { API_PATHS } from '@omni/shared/api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../common/db';
import { clearAvatarStorageOverride, setAvatarStorageOverride } from '../../common/storage';
import { gifBytes, jpegBytes, pngBytes, svgBytes, webpBytes } from '../../test/avatar-images';
import { authHeader } from '../../test/integration/auth';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { createUser, toJwtUser } from '../../test/integration/factories';
import { FAKE_AVATAR_BASE_URL, createFakeAvatarStorage } from '../../test/integration/fakeAvatarStorage';
import type { FakeAvatarStorage } from '../../test/integration/fakeAvatarStorage';

const app = createIntegrationApp();

describe('avatar routes (integration)', () => {
  let storage: FakeAvatarStorage;
  let user: Awaited<ReturnType<typeof createUser>>;
  let auth: string;

  const put = (file: Buffer, options: { filename?: string; contentType?: string; field?: string } = {}) =>
    request(app)
      .put(API_PATHS.users.avatar)
      .set('Authorization', auth)
      .attach(options.field ?? AVATAR_FIELD, file, {
        filename: options.filename ?? 'foto.png',
        contentType: options.contentType ?? 'image/png',
      });

  const storedAvatarUrl = async () =>
    (await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { avatarUrl: true } })).avatarUrl;

  beforeEach(async () => {
    storage = createFakeAvatarStorage();
    setAvatarStorageOverride(storage);
    user = await createUser({ username: 'avataruser' });
    auth = authHeader(toJwtUser(user));
  });

  afterEach(() => {
    clearAvatarStorageOverride();
  });

  describe('PUT /api/users/avatar', () => {
    it('sin auth responde 401 y no sube nada', async () => {
      const res = await request(app).put(API_PATHS.users.avatar).attach(AVATAR_FIELD, pngBytes(), 'foto.png');

      expect(res.status).toBe(401);
      expect(storage.uploads).toHaveLength(0);
    });

    it('sube la foto, guarda la URL en el usuario y devuelve el perfil', async () => {
      const res = await put(pngBytes());

      expect(res.status).toBe(200);
      const body = avatarResponseSchema.parse(res.body);
      const [upload] = storage.uploads;
      expect(upload?.path).toMatch(new RegExp(`^${user.id}/[0-9a-f-]{36}\\.png$`));
      expect(upload?.contentType).toBe('image/png');
      expect(body.user.avatarUrl).toBe(`${FAKE_AVATAR_BASE_URL}${upload?.path}`);
      expect(await storedAvatarUrl()).toBe(body.user.avatarUrl);
      expect(res.body.user).toMatchObject({ id: user.id, username: 'avataruser' });
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.user).toHaveProperty('preferences');
    });

    it.each([
      ['image/jpeg', 'jpg', jpegBytes],
      ['image/png', 'png', pngBytes],
      ['image/webp', 'webp', webpBytes],
    ] as const)('acepta %s y lo guarda con su extensión y content type', async (mime, extension, makeBytes) => {
      const res = await put(makeBytes(), { contentType: mime, filename: `foto.${extension}` });

      expect(res.status).toBe(200);
      expect(storage.uploads[0]?.contentType).toBe(mime);
      expect(storage.uploads[0]?.path.endsWith(`.${extension}`)).toBe(true);
    });

    it('decide el formato por los bytes y no por el content type ni el nombre que declara el cliente', async () => {
      const res = await put(pngBytes(), { contentType: 'image/jpeg', filename: 'foto.gif' });

      expect(res.status).toBe(200);
      expect(storage.uploads[0]?.contentType).toBe('image/png');
      expect(storage.uploads[0]?.path.endsWith('.png')).toBe(true);
    });

    it('rechaza con 415 un archivo que declara image/png pero no tiene los bytes de una imagen', async () => {
      const res = await put(Buffer.from('<?php echo "no soy una imagen"; ?>'), {
        contentType: 'image/png',
        filename: 'foto.png',
      });

      expect(res.status).toBe(415);
      expect(res.body.message).toContain('JPG, PNG o WebP');
      expect(storage.uploads).toHaveLength(0);
      expect(await storedAvatarUrl()).toBeNull();
    });

    it.each([
      ['un GIF declarado como image/gif', gifBytes(), 'image/gif', 'animada.gif'],
      ['un GIF declarado como image/png', gifBytes(), 'image/png', 'foto.png'],
      ['un SVG declarado como image/png', svgBytes(), 'image/png', 'foto.png'],
    ])('rechaza con 415 %s', async (_name, bytes, contentType, filename) => {
      const res = await put(bytes, { contentType, filename });

      expect(res.status).toBe(415);
      expect(storage.uploads).toHaveLength(0);
    });

    it('acepta una foto de exactamente 2 MB', async () => {
      const res = await put(pngBytes(AVATAR_MAX_BYTES));

      expect(res.status).toBe(200);
      expect(storage.uploads[0]?.body.length).toBe(AVATAR_MAX_BYTES);
    });

    it('rechaza con 413 una foto de más de 2 MB y no sube nada', async () => {
      const res = await put(pngBytes(AVATAR_MAX_BYTES + 1));

      expect(res.status).toBe(413);
      expect(res.body.message).toBe('La foto no puede pesar más de 2 MB');
      expect(storage.uploads).toHaveLength(0);
      expect(await storedAvatarUrl()).toBeNull();
    });

    it('sin archivo responde 400', async () => {
      const json = await request(app).put(API_PATHS.users.avatar).set('Authorization', auth).send({ avatar: 'x' });
      const empty = await request(app).put(API_PATHS.users.avatar).set('Authorization', auth);

      expect(json.status).toBe(400);
      expect(json.body.message).toContain(AVATAR_FIELD);
      expect(empty.status).toBe(400);
      expect(storage.uploads).toHaveLength(0);
    });

    it('rechaza con 400 un archivo en otro campo y los campos de texto extra', async () => {
      const wrongField = await put(pngBytes(), { field: 'photo' });
      const extraField = await request(app)
        .put(API_PATHS.users.avatar)
        .set('Authorization', auth)
        .field('avatarUrl', 'https://evil.test/x.png')
        .attach(AVATAR_FIELD, pngBytes(), 'foto.png');

      expect(wrongField.status).toBe(400);
      expect(wrongField.body.message).toContain(AVATAR_FIELD);
      expect(extraField.status).toBe(400);
      expect(storage.uploads).toHaveLength(0);
      expect(await storedAvatarUrl()).toBeNull();
    });

    it('al reemplazar la foto borra el objeto anterior y deja solo el nuevo', async () => {
      const first = await put(pngBytes());
      const second = await put(jpegBytes(), { contentType: 'image/jpeg', filename: 'otra.jpg' });

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      const [firstUpload, secondUpload] = storage.uploads;
      expect(storage.removed).toEqual([firstUpload?.path]);
      expect([...storage.objects.keys()]).toEqual([secondUpload?.path]);
      expect(secondUpload?.path).not.toBe(firstUpload?.path);
      expect(await storedAvatarUrl()).toBe(`${FAKE_AVATAR_BASE_URL}${secondUpload?.path}`);
    });

    it('si falla la subida responde error y conserva la foto anterior', async () => {
      await put(pngBytes());
      const previousUrl = await storedAvatarUrl();
      storage.uploadError = new Error('storage caído');

      const res = await put(jpegBytes(), { contentType: 'image/jpeg' });

      expect(res.status).toBe(500);
      expect(storage.removed).toEqual([]);
      expect(storage.objects.size).toBe(1);
      expect(await storedAvatarUrl()).toBe(previousUrl);
    });

    it('si falla borrar la foto anterior igual completa el cambio', async () => {
      await put(pngBytes());
      storage.removeError = new Error('storage caído');

      const res = await put(jpegBytes(), { contentType: 'image/jpeg' });

      expect(res.status).toBe(200);
      expect(await storedAvatarUrl()).toBe(res.body.user.avatarUrl);
    });

    it('si el usuario desaparece antes de guardar la URL borra el objeto recién subido', async () => {
      storage.afterUpload = async () => {
        await prisma.user.deleteMany({ where: { id: user.id } });
      };

      const res = await put(pngBytes());

      expect(res.status).toBe(404);
      expect(storage.objects.size).toBe(0);
      expect(storage.removed).toEqual([storage.uploads[0]?.path]);
    });

    it('no borra del storage una URL previa que no es de este bucket ni de la carpeta del usuario', async () => {
      await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: 'https://example.com/foto.png' } });

      const external = await put(pngBytes());

      expect(external.status).toBe(200);
      expect(storage.removed).toEqual([]);

      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: `${FAKE_AVATAR_BASE_URL}otro-usuario/ajena.png` },
      });

      const foreign = await put(pngBytes());

      expect(foreign.status).toBe(200);
      expect(storage.removed).toEqual([]);
    });

    it('sin storage configurado responde 503', async () => {
      clearAvatarStorageOverride();

      const res = await put(pngBytes());

      expect(res.status).toBe(503);
      expect(await storedAvatarUrl()).toBeNull();
    });

    it('no deja que PATCH /profile cambie avatarUrl', async () => {
      const res = await request(app)
        .patch(API_PATHS.users.profile)
        .set('Authorization', auth)
        .send({ avatarUrl: 'https://evil.test/x.png' });

      expect(res.status).toBe(400);
      expect(await storedAvatarUrl()).toBeNull();
    });
  });

  describe('DELETE /api/users/avatar', () => {
    it('sin auth responde 401', async () => {
      const res = await request(app).delete(API_PATHS.users.avatar);

      expect(res.status).toBe(401);
    });

    it('borra el objeto, deja avatarUrl en null y devuelve el perfil', async () => {
      const uploaded = await put(pngBytes());
      expect(uploaded.status).toBe(200);

      const res = await request(app).delete(API_PATHS.users.avatar).set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(avatarResponseSchema.parse(res.body).user.avatarUrl).toBeNull();
      expect(storage.objects.size).toBe(0);
      expect(storage.removed).toEqual([storage.uploads[0]?.path]);
      expect(await storedAvatarUrl()).toBeNull();
    });

    it('sin foto es idempotente: 200 y no toca el storage', async () => {
      const res = await request(app).delete(API_PATHS.users.avatar).set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.user.avatarUrl).toBeNull();
      expect(storage.removed).toEqual([]);
    });

    it('si falla el borrado en el storage igual limpia el usuario', async () => {
      await put(pngBytes());
      storage.removeError = new Error('storage caído');

      const res = await request(app).delete(API_PATHS.users.avatar).set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(await storedAvatarUrl()).toBeNull();
    });

    it('con un token de un usuario que ya no existe responde 404', async () => {
      await prisma.user.deleteMany({ where: { id: user.id } });

      const res = await request(app).delete(API_PATHS.users.avatar).set('Authorization', auth);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/users/account', () => {
    it('borra también la foto de perfil del storage', async () => {
      await put(pngBytes());
      const path = storage.uploads[0]?.path;

      const res = await request(app).delete(API_PATHS.users.account).set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(storage.removed).toEqual([path]);
      expect(storage.objects.size).toBe(0);
      expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    });

    it('sin foto no toca el storage', async () => {
      const res = await request(app).delete(API_PATHS.users.account).set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(storage.removed).toEqual([]);
    });
  });
});
