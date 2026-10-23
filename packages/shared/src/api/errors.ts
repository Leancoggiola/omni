import { ApiError } from './ApiError';

type ErrorResponse = {
  status: number;
  statusText: string;
  json(): Promise<unknown>;
};

/** Arma el `ApiError` de una respuesta no OK con el `message` del body si lo trae, o el `statusText` si no. */
export async function toApiError(res: ErrorResponse): Promise<ApiError> {
  const info = (await res.json().catch(() => ({}))) as { message?: string } | null;
  return new ApiError(info?.message || res.statusText, res.status, info);
}

/**
 * Mensaje para mostrar al usuario: el de la API (`ApiError`, ya en español) o `fallback`. Un error de red, de parseo
 * o cualquier otro llega con un mensaje técnico y en inglés ("Failed to fetch"), así que no se muestra.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError && err.message ? err.message : fallback;
}

/**
 * Un 4xx no se arregla reintentando (el 401 ya pasó por el refresh del client, un 404 no va a aparecer). Un 408 y un
 * 429 sí: son transitorios, y el 429 también llega cuando el que lo devuelve es el refresh (el client propaga su
 * `ApiError`).
 */
export function isClientError(err: unknown): boolean {
  return err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 408 && err.status !== 429;
}

export const SWR_RETRY_OPTIONS = {
  errorRetryCount: 3,
  shouldRetryOnError: (err: unknown): boolean => !isClientError(err),
} as const;
