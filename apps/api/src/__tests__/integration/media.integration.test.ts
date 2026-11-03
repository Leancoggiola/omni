import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { prisma } from '../../common/db';
import { authHeader } from '../../test/integration/auth';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { createUser, linkUsers, toJwtUser } from '../../test/integration/factories';

vi.mock('../../media/tmdb.service');

import * as tmdbService from '../../media/tmdb.service';

const mockedTmdb = vi.mocked(tmdbService);

const app = createIntegrationApp();

const movieDetail = {
  id: 550,
  title: 'Fight Club',
  poster_path: '/poster.jpg',
  overview: '',
  release_date: '1999-10-15',
} as unknown as Awaited<ReturnType<typeof tmdbService.getMovieDetail>>;

const tvDetail = {
  id: 1399,
  name: 'Game of Thrones',
  poster_path: '/got.jpg',
  overview: '',
  first_air_date: '2011-04-17',
} as unknown as Awaited<ReturnType<typeof tmdbService.getTvDetail>>;

const searchResponse = {
  page: 1,
  results: [{ id: 550, media_type: 'movie', title: 'Fight Club' }],
  total_pages: 1,
  total_results: 1,
} as unknown as Awaited<ReturnType<typeof tmdbService.searchMulti>>;

describe('media routes (integration)', () => {
  let user: Awaited<ReturnType<typeof createUser>>;
  let auth: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockedTmdb.searchMulti.mockResolvedValue(searchResponse);
    mockedTmdb.searchMovies.mockResolvedValue(searchResponse);
    mockedTmdb.searchTv.mockResolvedValue(searchResponse);
    mockedTmdb.getMovieDetail.mockResolvedValue(movieDetail);
    mockedTmdb.getTvDetail.mockResolvedValue(tvDetail);

    user = await createUser({ username: 'media-owner' });
    auth = authHeader(toJwtUser(user));
  });

  describe('auth', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/media/list');
      expect(res.status).toBe(401);
    });
  });

  describe('search', () => {
    it('GET /search requires a query', async () => {
      const res = await request(app).get('/api/media/search').set('Authorization', auth);
      expect(res.status).toBe(400);
    });

    it('GET /search delegates to the multi search by default', async () => {
      const res = await request(app).get('/api/media/search?query=fight').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body.results).toHaveLength(1);
      expect(mockedTmdb.searchMulti).toHaveBeenCalledWith('fight', 1);
      expect(mockedTmdb.searchMovies).not.toHaveBeenCalled();
    });

    it('GET /search passes a numeric page after coercion', async () => {
      const res = await request(app).get('/api/media/search?query=fight&page=3').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(mockedTmdb.searchMulti).toHaveBeenCalledWith('fight', 3);
      const [, page] = mockedTmdb.searchMulti.mock.calls[0]!;
      expect(typeof page).toBe('number');
    });

    it('GET /search routes to the movie endpoint when type is movie', async () => {
      const res = await request(app).get('/api/media/search?query=fight&type=movie').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(mockedTmdb.searchMovies).toHaveBeenCalledWith('fight', 1);
    });
  });

  describe('list', () => {
    it('POST /list stores the item using the title from TMDB', async () => {
      const res = await request(app)
        .post('/api/media/list')
        .set('Authorization', auth)
        .send({ tmdbId: 550, mediaType: 'movie' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        tmdbId: 550,
        mediaType: 'movie',
        title: 'Fight Club',
        posterPath: '/poster.jpg',
        status: 'to_watch',
      });
      expect(await prisma.mediaItem.count({ where: { createdById: user.id } })).toBe(1);
    });

    it('POST /list uses the name field for tv shows', async () => {
      const res = await request(app)
        .post('/api/media/list')
        .set('Authorization', auth)
        .send({ tmdbId: 1399, mediaType: 'tv', status: 'watching' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ title: 'Game of Thrones', status: 'watching' });
    });

    it('POST /list returns 400 on an invalid payload', async () => {
      const res = await request(app).post('/api/media/list').set('Authorization', auth).send({ tmdbId: 550 });
      expect(res.status).toBe(400);
    });

    it('POST /list returns 409 when the item is already in the list', async () => {
      await request(app).post('/api/media/list').set('Authorization', auth).send({ tmdbId: 550, mediaType: 'movie' });

      const res = await request(app)
        .post('/api/media/list')
        .set('Authorization', auth)
        .send({ tmdbId: 550, mediaType: 'movie' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Este elemento ya está en tu lista');
      expect(await prisma.mediaItem.count({ where: { createdById: user.id } })).toBe(1);
    });

    it('GET /list returns only the items of the authenticated user', async () => {
      await request(app).post('/api/media/list').set('Authorization', auth).send({ tmdbId: 550, mediaType: 'movie' });

      const other = await createUser({ username: 'media-other' });
      await request(app)
        .post('/api/media/list')
        .set('Authorization', authHeader(toJwtUser(other)))
        .send({ tmdbId: 1399, mediaType: 'tv' });

      const res = await request(app).get('/api/media/list').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ tmdbId: 550 });
    });

    it('GET /list filters by status', async () => {
      await request(app)
        .post('/api/media/list')
        .set('Authorization', auth)
        .send({ tmdbId: 550, mediaType: 'movie', status: 'watched' });
      await request(app)
        .post('/api/media/list')
        .set('Authorization', auth)
        .send({ tmdbId: 1399, mediaType: 'tv', status: 'to_watch' });

      const res = await request(app).get('/api/media/list?status=watched').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ tmdbId: 550 });
    });

    it('PATCH /list/:id updates the status', async () => {
      const created = await request(app)
        .post('/api/media/list')
        .set('Authorization', auth)
        .send({ tmdbId: 550, mediaType: 'movie', status: 'to_watch' });

      const res = await request(app)
        .patch(`/api/media/list/${created.body.id}`)
        .set('Authorization', auth)
        .send({ status: 'watched' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('watched');
    });

    it('PATCH /list/:id returns 404 for an item of another user', async () => {
      const other = await createUser({ username: 'media-other' });
      const created = await request(app)
        .post('/api/media/list')
        .set('Authorization', authHeader(toJwtUser(other)))
        .send({ tmdbId: 550, mediaType: 'movie' });

      const res = await request(app)
        .patch(`/api/media/list/${created.body.id}`)
        .set('Authorization', auth)
        .send({ status: 'watched' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Elemento no encontrado');
    });

    it('DELETE /list/:id returns 204 and removes the row', async () => {
      const created = await request(app)
        .post('/api/media/list')
        .set('Authorization', auth)
        .send({ tmdbId: 550, mediaType: 'movie' });

      const res = await request(app).delete(`/api/media/list/${created.body.id}`).set('Authorization', auth);

      expect(res.status).toBe(204);
      expect(await prisma.mediaItem.count({ where: { createdById: user.id } })).toBe(0);
    });

    it('DELETE /list/:id returns 404 for an unknown item', async () => {
      const res = await request(app).delete('/api/media/list/missing').set('Authorization', auth);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Elemento no encontrado');
    });
  });

  describe('lista compartida entre dos personas vinculadas', () => {
    let partner: Awaited<ReturnType<typeof createUser>>;
    let partnerAuth: string;

    beforeEach(async () => {
      partner = await createUser({ username: 'media-partner' });
      partnerAuth = authHeader(toJwtUser(partner));
      await linkUsers(user.id, partner.id);
    });

    it('GET /list devuelve a ambos la misma lista, con quién agregó cada ítem', async () => {
      await request(app).post('/api/media/list').set('Authorization', auth).send({ tmdbId: 550, mediaType: 'movie' });
      await request(app)
        .post('/api/media/list')
        .set('Authorization', partnerAuth)
        .send({ tmdbId: 1399, mediaType: 'tv' });

      const mine = await request(app).get('/api/media/list').set('Authorization', auth);
      const theirs = await request(app).get('/api/media/list').set('Authorization', partnerAuth);

      expect(mine.status).toBe(200);
      expect(mine.body).toHaveLength(2);
      expect(theirs.body).toEqual(mine.body);
      const authors = Object.fromEntries(
        mine.body.map((i: { tmdbId: number; createdById: string }) => [i.tmdbId, i.createdById])
      );
      expect(authors).toEqual({ 550: user.id, 1399: partner.id });
    });

    it('POST /list devuelve 409 si la otra persona ya lo agregó', async () => {
      await request(app).post('/api/media/list').set('Authorization', auth).send({ tmdbId: 550, mediaType: 'movie' });

      const res = await request(app)
        .post('/api/media/list')
        .set('Authorization', partnerAuth)
        .send({ tmdbId: 550, mediaType: 'movie' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Este elemento ya está en tu lista');
      expect(await prisma.mediaItem.count()).toBe(1);
    });

    it('PATCH /list/:id permite a la otra persona cambiar el estado común y no cambia la autoría', async () => {
      const created = await request(app)
        .post('/api/media/list')
        .set('Authorization', auth)
        .send({ tmdbId: 550, mediaType: 'movie' });

      const res = await request(app)
        .patch(`/api/media/list/${created.body.id}`)
        .set('Authorization', partnerAuth)
        .send({ status: 'watched' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'watched', createdById: user.id });
      const seen = await request(app).get('/api/media/list').set('Authorization', auth);
      expect(seen.body[0].status).toBe('watched');
    });

    it('PATCH /list/:id con ediciones seguidas gana la última', async () => {
      const created = await request(app)
        .post('/api/media/list')
        .set('Authorization', auth)
        .send({ tmdbId: 550, mediaType: 'movie' });
      const url = `/api/media/list/${created.body.id}`;

      await request(app).patch(url).set('Authorization', auth).send({ status: 'watching' });
      await request(app).patch(url).set('Authorization', partnerAuth).send({ status: 'watched' });

      const res = await request(app).get('/api/media/list').set('Authorization', auth);
      expect(res.body[0].status).toBe('watched');
    });

    it('DELETE /list/:id permite a la otra persona borrar el ítem', async () => {
      const created = await request(app)
        .post('/api/media/list')
        .set('Authorization', auth)
        .send({ tmdbId: 550, mediaType: 'movie' });

      const res = await request(app).delete(`/api/media/list/${created.body.id}`).set('Authorization', partnerAuth);

      expect(res.status).toBe(204);
      const seen = await request(app).get('/api/media/list').set('Authorization', auth);
      expect(seen.body).toHaveLength(0);
    });

    it('una tercera persona sin vincular no ve ni toca la lista del hogar', async () => {
      const created = await request(app)
        .post('/api/media/list')
        .set('Authorization', auth)
        .send({ tmdbId: 550, mediaType: 'movie' });
      const stranger = await createUser({ username: 'media-stranger' });
      const strangerAuth = authHeader(toJwtUser(stranger));

      const list = await request(app).get('/api/media/list').set('Authorization', strangerAuth);
      const patch = await request(app)
        .patch(`/api/media/list/${created.body.id}`)
        .set('Authorization', strangerAuth)
        .send({ status: 'watched' });

      expect(list.body).toEqual([]);
      expect(patch.status).toBe(404);
    });
  });
});
