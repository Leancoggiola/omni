import {
  isApiResponse,
  nextWakeDelay,
  SERVER_WAKE_FAILURE_MESSAGE,
  SERVER_WAKE_FAILURE_STATUS,
  SERVER_WAKE_PROBE_TIMEOUT_MS,
  SERVER_WAKE_TIMEOUT_MS,
} from '@omni/shared/server-wake';

import { ApiError } from './ApiError';
import { toUrl } from './baseUrl';
import { API_KEYS } from './keys';

type WakeListener = (waking: boolean) => void;

let wakePromise: Promise<boolean> | null = null;
let waking = false;
const listeners = new Set<WakeListener>();

function setWaking(value: boolean): void {
  if (waking === value) return;
  waking = value;
  listeners.forEach(listener => listener(value));
}

/**
 * Avisa cuando la API empieza o deja de despertar. Llama al listener enseguida con el estado actual y
 * devuelve la función para desuscribirse.
 */
export function subscribeServerWake(listener: WakeListener): () => void {
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
  try {
    const res = await fetch(toUrl(API_KEYS.health), { signal: controller.signal });
    return res.ok && isApiResponse(res);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function pollUntilAwake(): Promise<boolean> {
  const deadline = Date.now() + SERVER_WAKE_TIMEOUT_MS;
  try {
    for (let attempt = 0; ; attempt += 1) {
      if (await probeHealth()) return true;
      if (Date.now() >= deadline) return false;
      setWaking(true);
      await sleep(Math.min(nextWakeDelay(attempt), Math.max(deadline - Date.now(), 0)));
    }
  } finally {
    setWaking(false);
  }
}

/** Single-flight: todos los requests que fallan mientras la API duerme comparten el mismo polling. */
export function ensureServerAwake(): Promise<boolean> {
  if (!wakePromise) {
    wakePromise = pollUntilAwake().finally(() => {
      wakePromise = null;
    });
  }
  return wakePromise;
}

async function tryFetch(url: string, init?: RequestInit): Promise<Response | null> {
  try {
    const res = await fetch(url, init);
    return isApiResponse(res) ? res : null;
  } catch (err) {
    if (init?.signal?.aborted) throw err;
    return null;
  }
}

/**
 * `fetch` que tolera el cold start de la API. Solo reintenta si el request falló en red o la respuesta
 * no es JSON (no salió de nuestra API, así que nunca se procesó); un 500 JSON se devuelve tal cual. Si
 * el servidor no despierta a tiempo, lanza `ApiError` 503.
 */
export async function fetchWithWake(url: string, init?: RequestInit): Promise<Response> {
  const first = await tryFetch(url, init);
  if (first) return first;

  if (await ensureServerAwake()) {
    const retry = await tryFetch(url, init);
    if (retry) return retry;
  }
  throw new ApiError(SERVER_WAKE_FAILURE_MESSAGE, SERVER_WAKE_FAILURE_STATUS);
}
