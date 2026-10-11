/// <reference lib="dom" />

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

export const SERVER_WAKE_MESSAGE = 'Despertando el servidor, puede tardar hasta un minuto y medio…';
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
 * `false` si la respuesta es del proxy o de la plataforma y no de nuestra API: no es JSON y además trae un
 * 502/503/504 o un `content-type` `text/html` (la página de "loading" de Render, la de error de Vercel).
 * En ese caso el request no llegó a la API y reintentarlo es seguro con cualquier método, también POST/PATCH.
 * Una respuesta JSON es siempre de la API, con cualquier status (un 502 por un fallo de Wikipedia o TMDB llega
 * con su mensaje). Lo demás (204, 304, 404 o texto) también se devuelve tal cual.
 */
export function isApiResponse(res: ResponseLike): boolean {
  const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
  if (contentType.includes('application/json')) return true;
  return !(PLATFORM_STATUSES.includes(res.status) || contentType.includes('text/html'));
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

/** `awake`: el health respondió; `timeout`: se agotó el tope; `offline`: sin conexión (ver `createServerWake`). */
type WakeOutcome = 'awake' | 'timeout' | 'offline';

/** `asleep` cubre respuesta del proxy, timeout del sondeo y URL mal configurada; `offline`, el error de red. */
type ProbeResult = 'awake' | 'asleep' | 'offline';

/** Sondeos consecutivos con error de red, sin ninguna respuesta HTTP previa, para concluir "sin conexión". */
const OFFLINE_PROBES = 2;

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
  /** `true` si el dispositivo sabe que no tiene red (web: `navigator.onLine === false`): corta el polling enseguida. */
  isOffline?: () => boolean;
};

/**
 * Orquesta el "despertar el servidor" (cold start de la API en Render free) para un cliente: single-flight,
 * polling del health con backoff, tope de 90 s y reintento del request. Cada cliente (web, mobile) crea
 * una instancia con su `fetch`, su URL de health y su `ApiError`, y le suma su propia UI del aviso.
 * El aviso (`subscribeServerWake`) se enciende cuando falla el primer sondeo o pasan
 * `SERVER_WAKE_NOTICE_DELAY_MS` sin respuesta, lo que ocurra primero.
 * Sin conexión no se espera 90 s: si `isOffline()` es `true`, o si `OFFLINE_PROBES` sondeos seguidos
 * fallan por un error de red (no por su propio timeout) sin que ninguno haya recibido una respuesta HTTP,
 * el polling se corta, sin aviso, y `fetchWithWake` relanza el error de red del request. Una respuesta del
 * proxy (502/503/504, HTML) o un timeout del sondeo significan "servidor dormido" y siguen el polling.
 * El tope de 90 s incluye al último sondeo: su timeout se acota a lo que queda y no hay sondeo extra.
 */
export function createServerWake(options: ServerWakeOptions) {
  let wakePromise: Promise<WakeOutcome> | null = null;
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

  async function probeHealth(timeoutMs: number): Promise<{ result: ProbeResult; gotResponse: boolean }> {
    let url: string;
    try {
      url = typeof options.healthUrl === 'function' ? options.healthUrl() : options.healthUrl;
    } catch {
      return { result: 'asleep', gotResponse: false };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await options.fetch(url, { ...options.probeInit, signal: controller.signal });
      return { result: res.ok && isApiResponse(res) ? 'awake' : 'asleep', gotResponse: true };
    } catch {
      return { result: controller.signal.aborted ? 'asleep' : 'offline', gotResponse: false };
    } finally {
      clearTimeout(timer);
    }
  }

  async function pollUntilAwake(): Promise<WakeOutcome> {
    const deadline = Date.now() + SERVER_WAKE_TIMEOUT_MS;
    let noticeTimer: ReturnType<typeof setTimeout> | undefined = setTimeout(
      () => setWaking(true),
      SERVER_WAKE_NOTICE_DELAY_MS
    );
    let heardFromServer = false;
    let offlineProbes = 0;
    try {
      for (let attempt = 0; ; attempt += 1) {
        if (options.isOffline?.()) return 'offline';
        const remaining = deadline - Date.now();
        if (remaining <= 0) return 'timeout';

        const probe = await probeHealth(Math.min(SERVER_WAKE_PROBE_TIMEOUT_MS, remaining));
        if (probe.result === 'awake') return 'awake';

        heardFromServer ||= probe.gotResponse;
        if (probe.result === 'offline' && !heardFromServer) {
          offlineProbes += 1;
          if (offlineProbes >= OFFLINE_PROBES) return 'offline';
          clearTimeout(noticeTimer);
          noticeTimer = undefined;
        } else {
          offlineProbes = 0;
          setWaking(true);
        }
        const pause = Math.min(nextWakeDelay(attempt), deadline - Date.now());
        if (pause > 0) await sleep(pause);
      }
    } finally {
      clearTimeout(noticeTimer);
      setWaking(false);
    }
  }

  /** Single-flight: todos los requests que fallan mientras la API duerme comparten el mismo polling. */
  function awaitServer(): Promise<WakeOutcome> {
    if (!wakePromise) {
      wakePromise = pollUntilAwake().finally(() => {
        wakePromise = null;
      });
    }
    return wakePromise;
  }

  /** `true` si la API despertó; `false` si se agotó el tope o no hay conexión. */
  async function ensureServerAwake(): Promise<boolean> {
    return (await awaitServer()) === 'awake';
  }

  function abortError(signal: AbortSignal): unknown {
    if (signal.reason !== undefined) return signal.reason;
    const error = new Error('The operation was aborted.');
    error.name = 'AbortError';
    return error;
  }

  /** Espera al polling compartido, pero si el caller aborta su request deja de esperar y relanza el abort. */
  async function awaitServerUnlessAborted(signal?: AbortSignal | null): Promise<WakeOutcome> {
    if (!signal) return awaitServer();
    if (signal.aborted) throw abortError(signal);

    let onAbort: (() => void) | undefined;
    const aborted = new Promise<never>((_resolve, reject) => {
      onAbort = () => reject(abortError(signal));
      signal.addEventListener('abort', onAbort, { once: true });
    });
    try {
      return await Promise.race([awaitServer(), aborted]);
    } finally {
      if (onAbort) signal.removeEventListener('abort', onAbort);
    }
  }

  /** `response` es `null` si hay que esperar al servidor; `error` guarda el error de red que lo causó. */
  async function tryRequest(url: string, init?: RequestInit): Promise<{ response: Response | null; error?: unknown }> {
    try {
      const res = await options.fetch(url, init);
      return { response: isApiResponse(res) ? res : null };
    } catch (err) {
      if (init?.signal?.aborted || !isIdempotentMethod(init?.method)) throw err;
      return { response: null, error: err };
    }
  }

  /**
   * `fetch` que tolera el cold start de la API. Reintenta en dos casos: la respuesta es del proxy o de la
   * plataforma (`isApiResponse`: el request no llegó a la API, vale para cualquier método) o el `fetch`
   * lanzó un error de red (solo en GET/HEAD/PUT/DELETE; en POST/PATCH el error se propaga porque no se
   * sabe si la API procesó el request). Cualquier otra respuesta, un 500 JSON incluido, se devuelve tal
   * cual. Si el servidor no despierta a tiempo, lanza el error de `createError` con status 503. Si se
   * detecta que no hay conexión, relanza el error de red original del request sin esperar. Si el caller
   * aborta su request mientras espera, relanza el abort sin seguir esperando al polling.
   */
  async function fetchWithWake(url: string, init?: RequestInit): Promise<Response> {
    const first = await tryRequest(url, init);
    if (first.response) return first.response;

    const outcome = await awaitServerUnlessAborted(init?.signal);
    if (outcome === 'offline' && first.error !== undefined) throw first.error;
    if (outcome === 'awake') {
      const retry = await tryRequest(url, init);
      if (retry.response) return retry.response;
    }
    throw options.createError(SERVER_WAKE_FAILURE_MESSAGE, SERVER_WAKE_FAILURE_STATUS);
  }

  return { fetchWithWake, ensureServerAwake, subscribeServerWake };
}
