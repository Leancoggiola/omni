// Stub de TMDB. La API llama a TMDB desde el servidor, así que interceptar en el browser no alcanza:
// se levanta este servidor y se apunta la API con TMDB_BASE_URL.
import { createServer } from 'node:http';

const PORT = Number(process.env.TMDB_STUB_PORT ?? 3199);

export const MOVIE = {
  id: 550,
  title: 'Fight Club',
  poster_path: '/fight-club.jpg',
  overview: 'Un empleado insomne y un fabricante de jabón.',
  release_date: '1999-10-15',
  vote_average: 8.4,
  genres: [{ id: 18, name: 'Drama' }],
  runtime: 139,
};

export const TV_SHOW = {
  id: 1399,
  name: 'Game of Thrones',
  poster_path: '/got.jpg',
  overview: 'Nueve familias nobles luchan por el control de Westeros.',
  first_air_date: '2011-04-17',
  vote_average: 8.4,
  genres: [{ id: 10765, name: 'Sci-Fi & Fantasy' }],
  number_of_seasons: 8,
};

const SEARCH_RESULTS = [
  { ...MOVIE, media_type: 'movie' },
  { ...TV_SHOW, media_type: 'tv' },
];

function searchPayload(query) {
  const term = (query ?? '').toLowerCase();
  const results = term
    ? SEARCH_RESULTS.filter(item => (item.title ?? item.name).toLowerCase().includes(term))
    : SEARCH_RESULTS;
  return { page: 1, results, total_pages: 1, total_results: results.length };
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(payload);
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  if (path === '/health') return send(res, 200, { status: 'ok' });

  if (path.startsWith('/search/')) {
    return send(res, 200, searchPayload(url.searchParams.get('query')));
  }

  if (path.startsWith('/movie/')) {
    return send(res, 200, MOVIE);
  }

  if (path.startsWith('/tv/')) {
    return send(res, 200, TV_SHOW);
  }

  return send(res, 404, { status_message: `TMDB stub: ruta no contemplada ${path}` });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TMDB stub escuchando en http://127.0.0.1:${PORT}`);
});
