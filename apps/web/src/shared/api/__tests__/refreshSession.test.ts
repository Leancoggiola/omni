import { afterEach, describe, expect, it, vi } from 'vitest';

import { SWR_KEYS } from '../keys';
import {
  clearOnAuthFailure,
  ensureRefreshed,
  notifyAuthFailure,
  setOnAuthFailure,
  shouldSkipRefresh,
} from '../refreshSession';

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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    await expect(ensureRefreshed()).resolves.toBe(true);
  });

  it('resolves false when the refresh request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    await expect(ensureRefreshed()).resolves.toBe(false);
  });

  it('dedupes concurrent calls into a single fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([ensureRefreshed(), ensureRefreshed()]);

    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('allows a new refresh after the previous one settles', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await ensureRefreshed();
    await ensureRefreshed();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
