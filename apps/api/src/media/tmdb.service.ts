import type { TmdbMediaResult, TmdbMovieDetail, TmdbSearchResponse, TmdbTvDetail } from '@omni/shared/media';
import { config } from '../config';

export type { TmdbMediaResult, TmdbMovieDetail, TmdbSearchResponse, TmdbTvDetail };

const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Traduce una falla de TMDB al error HTTP que expone la API. Un 401/403 de TMDB es un problema de credenciales de la
 * API hacia TMDB, no de la sesión del usuario: se reenvía como 502 para que los clientes no lo lean como sesión vencida.
 */
function upstreamError(err: unknown): { status: number; message: string } {
  if (err instanceof Error && err.name === 'TimeoutError') {
    return { status: 504, message: 'TMDB no respondió a tiempo' };
  }
  return { status: 502, message: 'No se pudo contactar a TMDB' };
}

function upstreamStatusError(status: number): { status: number; message: string } {
  if (status === 404) return { status: 404, message: 'No se encontró el título en TMDB' };
  return { status: 502, message: 'Error de TMDB' };
}

/**
 * Autentica con el "API Read Access Token" de TMDB en `Authorization: Bearer`, así la credencial no queda en la URL.
 * El `signal` cubre también la lectura del body: un timeout en `res.json()` se rechaza con el mismo `TimeoutError`.
 */
async function get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${config.tmdb.baseUrl}${path}`);
  url.searchParams.set('language', 'en-US');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${config.tmdb.apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw upstreamError(err);
  }

  if (!res.ok) {
    throw upstreamStatusError(res.status);
  }

  try {
    return (await res.json()) as T;
  } catch (err) {
    throw upstreamError(err);
  }
}

export async function searchMulti(query: string, page = 1): Promise<TmdbSearchResponse> {
  const result = await get<TmdbSearchResponse>('/search/multi', {
    query,
    page,
  });
  result.results = result.results.filter((r: TmdbMediaResult) => r.media_type === 'movie' || r.media_type === 'tv');
  return result;
}

export async function searchMovies(query: string, page = 1): Promise<TmdbSearchResponse> {
  return get<TmdbSearchResponse>('/search/movie', { query, page });
}

export async function searchTv(query: string, page = 1): Promise<TmdbSearchResponse> {
  return get<TmdbSearchResponse>('/search/tv', { query, page });
}

export async function getMovieDetail(tmdbId: number): Promise<TmdbMovieDetail> {
  return get<TmdbMovieDetail>(`/movie/${tmdbId}`);
}

export async function getTvDetail(tmdbId: number): Promise<TmdbTvDetail> {
  return get<TmdbTvDetail>(`/tv/${tmdbId}`);
}
