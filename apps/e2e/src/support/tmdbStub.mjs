// Stub de TMDB. La API llama a TMDB desde el servidor, así que interceptar en el browser no alcanza:
// se levanta este servidor y se apunta la API con TMDB_BASE_URL.
import { createServer } from 'node:http';

const PORT = Number(process.env.TMDB_STUB_PORT ?? 3199);

const MOVIES = [
  { id: 550, title: 'Fight Club', release_date: '1999-10-15' },
  { id: 603, title: 'The Matrix', release_date: '1999-03-31' },
  { id: 27205, title: 'Inception', release_date: '2010-07-16' },
  { id: 13, title: 'Forrest Gump', release_date: '1994-07-06' },
].map(movie => ({
  ...movie,
  poster_path: `/${movie.id}.jpg`,
  overview: `Sinopsis de ${movie.title}.`,
  vote_average: 8.4,
  genres: [{ id: 18, name: 'Drama' }],
  runtime: 139,
}));

const TV_SHOWS = [
  { id: 1399, name: 'Game of Thrones', first_air_date: '2011-04-17' },
  { id: 1396, name: 'Breaking Bad', first_air_date: '2008-01-20' },
].map(show => ({
  ...show,
  poster_path: `/${show.id}.jpg`,
  overview: `Sinopsis de ${show.name}.`,
  vote_average: 8.9,
  genres: [{ id: 18, name: 'Drama' }],
  number_of_seasons: 5,
}));

const byId = new Map([...MOVIES, ...TV_SHOWS].map(item => [item.id, item]));

function searchPayload(query, kind) {
  const term = (query ?? '').trim().toLowerCase();
  const pool = [
    ...(kind === 'tv' ? [] : MOVIES.map(movie => ({ ...movie, media_type: 'movie' }))),
    ...(kind === 'movie' ? [] : TV_SHOWS.map(show => ({ ...show, media_type: 'tv' }))),
  ];
  const results = term ? pool.filter(item => (item.title ?? item.name).toLowerCase().includes(term)) : pool;
  return { page: 1, results, total_pages: 1, total_results: results.length };
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  if (path === '/health') return send(res, 200, { status: 'ok' });

  if (path.startsWith('/search/')) {
    return send(res, 200, searchPayload(url.searchParams.get('query'), path.slice('/search/'.length)));
  }

  const detail = path.match(/^\/(movie|tv)\/(\d+)$/);
  if (detail) {
    const item = byId.get(Number(detail[2]));
    return item
      ? send(res, 200, item)
      : send(res, 404, { status_message: `TMDB stub: no existe ${detail[1]} ${detail[2]}` });
  }

  return send(res, 404, { status_message: `TMDB stub: ruta no contemplada ${path}` });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TMDB stub escuchando en http://127.0.0.1:${PORT}`);
});
