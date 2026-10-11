/**
 * Lógica pura del "despertar el servidor" (cold start de la API en Render free). Sin estado ni I/O:
 * cada cliente (web, mobile) orquesta el polling con su propio `fetch` y su propio `ApiError`.
 */

/** Pausa máxima entre sondeos del health. */
export const SERVER_WAKE_MAX_BACKOFF_MS = 8_000;

/** Pausas iniciales entre sondeos del health: 2 s y 4 s; después se mantiene en el máximo (8 s). */
export const SERVER_WAKE_BACKOFF_MS = [2_000, 4_000, SERVER_WAKE_MAX_BACKOFF_MS] as const;

/** Tiempo máximo esperando que la API despierte antes de rendirse. */
export const SERVER_WAKE_TIMEOUT_MS = 90_000;

/** Tope de cada sondeo al health: un proxy dormido puede dejar la conexión colgada. */
export const SERVER_WAKE_PROBE_TIMEOUT_MS = 10_000;

export const SERVER_WAKE_MESSAGE = 'Despertando el servidor, puede tardar hasta un minuto…';
export const SERVER_WAKE_FAILURE_MESSAGE = 'El servidor no responde. Probá de nuevo en unos minutos.';
export const SERVER_WAKE_FAILURE_STATUS = 503;

type ResponseLike = {
  status: number;
  headers: { get(name: string): string | null };
};

/** Pausa antes del sondeo número `attempt` (desde 0); después del último escalón se mantiene en 8 s. */
export function nextWakeDelay(attempt: number): number {
  return SERVER_WAKE_BACKOFF_MS[Math.max(attempt, 0)] ?? SERVER_WAKE_MAX_BACKOFF_MS;
}

/**
 * `true` si la respuesta salió de nuestra API. La API responde siempre JSON (también en los errores),
 * así que cualquier otra cosa (502/503/504 del proxy, la página HTML de "loading" de Render) viene de
 * la plataforma y el request nunca se procesó: reintentarlo es seguro aunque sea POST/PATCH. El 204 no
 * lleva cuerpo ni `content-type`.
 */
export function isApiResponse(res: ResponseLike): boolean {
  if (res.status === 204) return true;
  return (res.headers.get('content-type') ?? '').toLowerCase().includes('application/json');
}
