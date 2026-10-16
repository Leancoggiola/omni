import { afterEach, describe, expect, it, vi } from 'vitest';

import { SWR_KEYS } from '../keys';
import {
  clearOnAuthFailure,
  ensureRefreshed,
  notifyAuthFailure,
  setOnAuthFailure,
  shouldSkipRefresh,
} from '../refreshSession';

const JSON_HEADERS = new Headers({ 'content-type': 'application/json' });

describe('shouldSkipRefresh', () => {
  it('skips auth endpoints to avoid refresh loops', () => {
    expect(shouldSkipRefresh(SWR_KEYS.auth.login)).toBe(true);
    expect(shouldSkipRefresh(SWR_KEYS.auth.logout)).toBe(true);
    expect(shouldSkipRefresh(SWR_KEYS.auth.refresh)).toBe(true);
  });

  it('does not skip other endpoints', () => {
    expect(shouldSkipRefresh(SWR_KEYS.auth.profile)).toBe(false);
    expect(shouldSkipRefresh('/api/media/list')).toBe(false);
  });
});

describe('notifyAuthFailure', () => {
  afterEach(() => {
    clearOnAuthFailure();
  });

  it('invokes the registered callback', () => {
    const callback = vi.fn();
    setOnAuthFailure(callback);

    notifyAuthFailure();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no callback is registered', () => {
    expect(() => notifyAuthFailure()).not.toThrow();
  });

  it('stops notifying after clearOnAuthFailure', () => {
    const callback = vi.fn();
    setOnAuthFailure(callback);
    clearOnAuthFailure();

    notifyAuthFailure();

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('ensureRefreshed', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves true when the refresh request succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, headers: JSON_HEADERS }));

    await expect(ensureRefreshed()).resolves.toBe(true);
  });

  it('resolves false when the refresh request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, headers: JSON_HEADERS }));

    await expect(ensureRefreshed()).resolves.toBe(false);
  });

  it('dedupes concurrent calls into a single fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, headers: JSON_HEADERS });
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([ensureRefreshed(), ensureRefreshed()]);

    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('allows a new refresh after the previous one settles', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, headers: JSON_HEADERS });
    vi.stubGlobal('fetch', fetchMock);

    await ensureRefreshed();
    await ensureRefreshed();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('ensureRefreshed: respuestas que no son sesión inválida', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([401, 403])('resuelve false con un %i: la API declara la sesión inválida', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status, headers: JSON_HEADERS }));

    await expect(ensureRefreshed()).resolves.toBe(false);
  });

  it.each([429, 500, 503])('rechaza con un ApiError %i en vez de dar la sesión por perdida', async status => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status,
        statusText: 'Error',
        headers: JSON_HEADERS,
        json: () => Promise.resolve({ message: 'Intentá de nuevo' }),
      })
    );

    await expect(ensureRefreshed()).rejects.toMatchObject({ name: 'ApiError', status, message: 'Intentá de nuevo' });
  });

  it('usa el statusText si el cuerpo del error no es JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: JSON_HEADERS,
        json: () => Promise.reject(new Error('no es JSON')),
      })
    );

    await expect(ensureRefreshed()).rejects.toMatchObject({ status: 500, message: 'Internal Server Error' });
  });

  it('propaga un error de red', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(ensureRefreshed()).rejects.toThrow('Failed to fetch');
  });

  it('permite un refresh nuevo después de un rechazo', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'x',
        headers: JSON_HEADERS,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({ ok: true, headers: JSON_HEADERS });
    vi.stubGlobal('fetch', fetchMock);

    await expect(ensureRefreshed()).rejects.toMatchObject({ status: 503 });
    await expect(ensureRefreshed()).resolves.toBe(true);
  });
});
