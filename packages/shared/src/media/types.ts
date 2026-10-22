export type MediaType = 'movie' | 'tv';
export type MediaStatus = 'to_watch' | 'watching' | 'watched';

/** Shape returned by GET /api/media/list (lean doc → JSON) */
export interface MediaItem {
  id: string;
  userId: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  status: MediaStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TmdbMediaResult {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path: string | null;
}

export interface TmdbSearchResponse {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbMediaResult[];
}

export interface TmdbMovieDetail {
  id: number;
  title: string;
  poster_path: string | null;
}

export interface TmdbTvDetail {
  id: number;
  name: string;
  poster_path: string | null;
}
