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

export const SERVER_REQUEST_TIMEOUT_MS = 30_000;
export const SERVER_MUTATION_TIMEOUT_MS = 100_000;

export const SERVER_WAKE_MESSAGE = 'Despertando el servidor, puede tardar hasta un minuto y medio…';
export const SERVER_WAKE_FAILURE_MESSAGE = 'El servidor no responde. Probá de nuevo en unos minutos.';
export const SERVER_WAKE_FAILURE_STATUS = 503;
export const SERVER_TIMEOUT_MESSAGE =
  'El servidor tardó demasiado en responder. Revisá tu conexión e intentá de nuevo.';
export const SERVER_GATEWAY_TIMEOUT_MESSAGE =
  'El servidor tardó demasiado en procesar el pedido. Revisá si se aplicó antes de intentar de nuevo.';

export const SERVER_TIMEOUT_STATUS = 0;
const GATEWAY_TIMEOUT_STATUS = 504;

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
 * Salvo un 504, el request no llegó a la API y reintentarlo es seguro con cualquier método (ver `fetchWithWake`).
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

export type FetchWithWakeOptions = {
  idempotent?: boolean;
};

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
 * polling del health con backoff, tope de 90 s, reintento del request y tope por intento del request
 * (`SERVER_REQUEST_TIMEOUT_MS` / `SERVER_MUTATION_TIMEOUT_MS`). Cada cliente (web, mobile) crea
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

  /**
   * Un intento del request con tope de `timeoutMs` hasta recibir los headers. Al vencer aborta el `fetch` y lanza el
   * error de `createError` con `SERVER_TIMEOUT_STATUS` (0: no hubo respuesta HTTP), aunque el `fetch` ignore el
   * abort. El abort del caller llega al `fetch` y su error se propaga tal cual. Si el intento responde, el listener
   * (`once`) queda conectado a propósito para que el abort del caller corte también la lectura del body.
   */
  async function fetchWithTimeout(url: string, init: RequestInit | undefined, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const callerSignal = init?.signal ?? undefined;
    const onCallerAbort = () => controller.abort(callerSignal?.reason);
    if (callerSignal?.aborted) onCallerAbort();
    else callerSignal?.addEventListener('abort', onCallerAbort, { once: true });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(options.createError(SERVER_TIMEOUT_MESSAGE, SERVER_TIMEOUT_STATUS));
        controller.abort();
      }, timeoutMs);
    });
    try {
      return await Promise.race([options.fetch(url, { ...init, signal: controller.signal }), timeout]);
    } catch (err) {
      callerSignal?.removeEventListener('abort', onCallerAbort);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * `response` es `null` si hay que esperar al servidor; `error` guarda el error de red o de timeout que lo causó.
   * Un 504 del proxy en un request no idempotente se lanza enseguida: el proxy ya lo reenvió y la API pudo procesarlo.
   */
  async function tryRequest(
    url: string,
    init: RequestInit | undefined,
    idempotent: boolean
  ): Promise<{ response: Response | null; error?: unknown }> {
    let res: Response;
    try {
      res = await fetchWithTimeout(url, init, idempotent ? SERVER_REQUEST_TIMEOUT_MS : SERVER_MUTATION_TIMEOUT_MS);
    } catch (err) {
      if (init?.signal?.aborted || !idempotent) throw err;
      return { response: null, error: err };
    }
    if (isApiResponse(res)) return { response: res };
    if (res.status === GATEWAY_TIMEOUT_STATUS && !idempotent) {
      throw options.createError(SERVER_GATEWAY_TIMEOUT_MESSAGE, GATEWAY_TIMEOUT_STATUS);
    }
    return { response: null };
  }

  /**
   * `fetch` que tolera el cold start de la API, con tope por intento hasta recibir los headers (el `fetch` de React
   * Native no pone ninguno). Los idempotentes cortan a los 30 s (`SERVER_REQUEST_TIMEOUT_MS`) y pasan al polling,
   * así un cold start que retiene la conexión no se pierde. Los demás no pasan por el polling y esperan 100 s
   * (`SERVER_MUTATION_TIMEOUT_MS`): más que el cold start (~1 min, el login suele ser el primero) y menos que los
   * 120 s del proxy de Vercel. Idempotentes son GET/HEAD/PUT/DELETE, o lo que `fetchOptions.idempotent` fuerce (el
   * refresh: la API lo acepta repetido dentro de su gracia de rotación de 30 s, y no repetirlo enseguida la deja
   * fuera de ella). El reintento sale con el primer sondeo del health que responde, a lo sumo
   * `SERVER_WAKE_MAX_BACKOFF_MS` (8 s) después de que la API vuelve a contestar: dentro de la gracia aunque el
   * request original se haya procesado al despertar. No queda cubierto el caso de una API que procesa el refresh
   * pero no contesta el health. Reintenta en dos casos:
   * - La respuesta es del proxy o de la plataforma (`isApiResponse`). Con 502/503 el request no llegó a la API y se
   *   reintenta siempre: es lo que llega en un cold start, también al login. Queda el riesgo, raro, de un 502 del
   *   proxy después de que la API procesó un POST/PATCH. Un 504 (el proxy reenvió el request y se cansó de esperar)
   *   solo se reintenta si es idempotente; si no, lanza el error de `createError` con status 504.
   * - El `fetch` lanzó un error de red o venció el tope, solo si es idempotente. Si no, el error se propaga porque
   *   no se sabe si la API procesó el request; el de timeout es el de `createError` con `SERVER_TIMEOUT_STATUS`.
   * Cualquier otra respuesta, un 500 JSON incluido, se devuelve tal cual. Si el servidor no despierta a tiempo,
   * lanza el error de `createError` con status 503. Si se detecta que no hay conexión, relanza el error original
   * del request sin esperar. Si el caller aborta su request, relanza el abort sin seguir esperando al polling.
   */
  async function fetchWithWake(
    url: string,
    init?: RequestInit,
    fetchOptions?: FetchWithWakeOptions
  ): Promise<Response> {
    const idempotent = fetchOptions?.idempotent ?? isIdempotentMethod(init?.method);
    const first = await tryRequest(url, init, idempotent);
    if (first.response) return first.response;

    const outcome = await awaitServerUnlessAborted(init?.signal);
    if (outcome === 'offline' && first.error !== undefined) throw first.error;
    if (outcome === 'awake') {
      const retry = await tryRequest(url, init, idempotent);
      if (retry.response) return retry.response;
    }
    throw options.createError(SERVER_WAKE_FAILURE_MESSAGE, SERVER_WAKE_FAILURE_STATUS);
  }

  return { fetchWithWake, ensureServerAwake, subscribeServerWake };
}
