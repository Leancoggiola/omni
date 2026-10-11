/** Pausa máxima entre sondeos del health. */
export const SERVER_WAKE_MAX_BACKOFF_MS = 8_000;

/** Pausas iniciales entre sondeos del health: 2 s y 4 s; después se mantiene en el máximo (8 s). */
export const SERVER_WAKE_BACKOFF_MS = [2_000, 4_000, SERVER_WAKE_MAX_BACKOFF_MS] as const;

/** Tiempo máximo esperando que la API despierte antes de rendirse. */
export const SERVER_WAKE_TIMEOUT_MS = 90_000;

/** Espera sin respuesta del primer sondeo tras la cual el aviso aparece igual: un corte breve no muestra nada, una espera larga sí. */
export const SERVER_WAKE_NOTICE_DELAY_MS = 1_500;

/** Tope de cada sondeo al health: un proxy dormido puede dejar la conexión colgada. */
export const SERVER_WAKE_PROBE_TIMEOUT_MS = 10_000;

export const SERVER_WAKE_MESSAGE = 'Despertando el servidor, puede tardar hasta un minuto…';
export const SERVER_WAKE_FAILURE_MESSAGE = 'El servidor no responde. Probá de nuevo en unos minutos.';
export const SERVER_WAKE_FAILURE_STATUS = 503;

type ResponseLike = {
  status: number;
  headers: { get(name: string): string | null };
};

/** Estados con los que un proxy o la plataforma (Render, Vercel) contesta cuando la API no está lista. */
const PLATFORM_STATUSES = [502, 503, 504];

/** Pausa antes del sondeo número `attempt` (desde 0); después del último escalón se mantiene en 8 s. */
export function nextWakeDelay(attempt: number): number {
  return SERVER_WAKE_BACKOFF_MS[Math.max(attempt, 0)] ?? SERVER_WAKE_MAX_BACKOFF_MS;
}

/**
 * `false` si la respuesta es del proxy o de la plataforma y no de nuestra API: un 502/503/504, o un
 * `content-type` `text/html` (la página de "loading" de Render, la de error de Vercel). En ese caso el
 * request no llegó a la API y reintentarlo es seguro con cualquier método, también POST/PATCH. Cualquier
 * otra respuesta (JSON, 204, 304, texto, redirect) es de la API y se devuelve tal cual.
 */
export function isApiResponse(res: ResponseLike): boolean {
  if (PLATFORM_STATUSES.includes(res.status)) return false;
  return !(res.headers.get('content-type') ?? '').toLowerCase().includes('text/html');
}

const IDEMPOTENT_METHODS = ['GET', 'HEAD', 'PUT', 'DELETE'];

/**
 * `true` si repetir el request con ese método no duplica efectos (default de `fetch`: GET). Un error de
 * red no dice si la API llegó a procesar el request antes de cortarse la conexión, así que solo se
 * reintenta en métodos idempotentes; en POST/PATCH el error se propaga.
 */
export function isIdempotentMethod(method?: string): boolean {
  return IDEMPOTENT_METHODS.includes((method ?? 'GET').toUpperCase());
}

type WakeListener = (waking: boolean) => void;

/** Dependencias de `createServerWake`: lo único que cambia entre web y mobile. */
export type ServerWakeOptions = {
  /** Se resuelve en cada llamada, así un `fetch` reemplazado (tests) o una base URL que cambia se respetan. */
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  /** URL del health; con función, se evalúa en cada sondeo. */
  healthUrl: string | (() => string);
  /** Opciones extra del `fetch` del sondeo (web: `{ cache: 'no-store' }`). */
  probeInit?: RequestInit;
  /** Error que lanza `fetchWithWake` cuando el servidor no despierta: cada cliente pone su `ApiError`. */
  createError: (message: string, status: number) => Error;
};

/**
 * Orquesta el "despertar el servidor" (cold start de la API en Render free) para un cliente: single-flight,
 * polling del health con backoff, tope de 90 s y reintento del request. Cada cliente (web, mobile) crea
 * una instancia con su `fetch`, su URL de health y su `ApiError`, y le suma su propia UI del aviso.
 * El aviso (`subscribeServerWake`) se enciende cuando falla el primer sondeo o pasan
 * `SERVER_WAKE_NOTICE_DELAY_MS` sin respuesta, lo que ocurra primero.
 */
export function createServerWake(options: ServerWakeOptions) {
  let wakePromise: Promise<boolean> | null = null;
  let waking = false;
  const listeners = new Set<WakeListener>();

  function setWaking(value: boolean): void {
    if (waking === value) return;
    waking = value;
    listeners.forEach(listener => listener(value));
  }

  /** Llama al listener enseguida con el estado actual y devuelve la función para desuscribirse. */
  function subscribeServerWake(listener: WakeListener): () => void {
    listeners.add(listener);
    listener(waking);
    return () => {
      listeners.delete(listener);
    };
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function probeHealth(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SERVER_WAKE_PROBE_TIMEOUT_MS);
    const url = typeof options.healthUrl === 'function' ? options.healthUrl() : options.healthUrl;
    try {
      const res = await options.fetch(url, { ...options.probeInit, signal: controller.signal });
      return res.ok && isApiResponse(res);
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  async function pollUntilAwake(): Promise<boolean> {
    const deadline = Date.now() + SERVER_WAKE_TIMEOUT_MS;
    const noticeTimer = setTimeout(() => setWaking(true), SERVER_WAKE_NOTICE_DELAY_MS);
    try {
      for (let attempt = 0; ; attempt += 1) {
        if (await probeHealth()) return true;
        if (Date.now() >= deadline) return false;
        setWaking(true);
        await sleep(Math.min(nextWakeDelay(attempt), Math.max(deadline - Date.now(), 0)));
      }
    } finally {
      clearTimeout(noticeTimer);
      setWaking(false);
    }
  }

  /** Single-flight: todos los requests que fallan mientras la API duerme comparten el mismo polling. */
  function ensureServerAwake(): Promise<boolean> {
    if (!wakePromise) {
      wakePromise = pollUntilAwake().finally(() => {
        wakePromise = null;
      });
    }
    return wakePromise;
  }

  async function tryFetch(url: string, init?: RequestInit): Promise<Response | null> {
    try {
      const res = await options.fetch(url, init);
      return isApiResponse(res) ? res : null;
    } catch (err) {
      if (init?.signal?.aborted || !isIdempotentMethod(init?.method)) throw err;
      return null;
    }
  }

  /**
   * `fetch` que tolera el cold start de la API. Reintenta en dos casos: la respuesta es del proxy o de la
   * plataforma (`isApiResponse`: el request no llegó a la API, vale para cualquier método) o el `fetch`
   * lanzó un error de red (solo en GET/HEAD/PUT/DELETE; en POST/PATCH el error se propaga porque no se
   * sabe si la API procesó el request). Cualquier otra respuesta, un 500 JSON incluido, se devuelve tal
   * cual. Si el servidor no despierta a tiempo, lanza el error de `createError` con status 503.
   */
  async function fetchWithWake(url: string, init?: RequestInit): Promise<Response> {
    const first = await tryFetch(url, init);
    if (first) return first;

    if (await ensureServerAwake()) {
      const retry = await tryFetch(url, init);
      if (retry) return retry;
    }
    throw options.createError(SERVER_WAKE_FAILURE_MESSAGE, SERVER_WAKE_FAILURE_STATUS);
  }

  return { fetchWithWake, ensureServerAwake, subscribeServerWake };
}
