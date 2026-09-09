import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, fetcher } from '../fetcher';
import { SWR_KEYS } from '../keys';
import { clearOnAuthFailure, setOnAuthFailure } from '../refreshSession';

describe('ApiError', () => {
  it('stores status and info', () => {
    const err = new ApiError('Not found', 404, { code: 'X' });
    expect(err.name).toBe('ApiError');
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err.info).toEqual({ code: 'X' });
  });
});

describe('fetcher', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearOnAuthFailure();
  });

  it('returns parsed json on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      })
    );

    await expect(fetcher('https://example.test/resource')).resolves.toEqual({ ok: true });
  });

  it('throws ApiError on failure with message from body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ message: 'Invalid' }),
      })
    );

    await expect(fetcher('https://example.test/resource')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Invalid',
      status: 400,
    });
  });

  it('falls back to statusText when body is not json', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: () => Promise.reject(new Error('no json')),
      })
    );

    await expect(fetcher('https://example.test/resource')).rejects.toMatchObject({
      message: 'Server Error',
      status: 500,
    });
  });

  it('retries once after a successful silent refresh on 401', async () => {
    const calls: string[] = [];
    let resourceCallCount = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        calls.push(url);
        if (url === SWR_KEYS.auth.refresh) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        resourceCallCount += 1;
        if (resourceCallCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: () => Promise.resolve({}),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: 'ok' }) });
      })
    );

    await expect(fetcher('/api/resource')).resolves.toEqual({ data: 'ok' });
    expect(calls).toEqual(['/api/resource', SWR_KEYS.auth.refresh, '/api/resource']);
  });

  it('notifies auth failure and throws when refresh fails', async () => {
    const onAuthFailure = vi.fn();
    setOnAuthFailure(onAuthFailure);

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === SWR_KEYS.auth.refresh) {
          return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
        }
        return Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({}),
        });
      })
    );

    await expect(fetcher('/api/resource')).rejects.toMatchObject({ status: 401 });
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it('does not attempt refresh for the refresh endpoint itself', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({}),
      })
    );

    await expect(fetcher(SWR_KEYS.auth.refresh)).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('shares a single refresh call across concurrent 401 responses', async () => {
    const callCounts: Record<string, number> = {};

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        callCounts[url] = (callCounts[url] ?? 0) + 1;
        if (url === SWR_KEYS.auth.refresh) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        if (callCounts[url] === 1) {
          return Promise.resolve({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: () => Promise.resolve({}),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ url }) });
      })
    );

    const [a, b] = await Promise.all([fetcher('/api/a'), fetcher('/api/b')]);

    expect(a).toEqual({ url: '/api/a' });
    expect(b).toEqual({ url: '/api/b' });
    expect(callCounts[SWR_KEYS.auth.refresh]).toBe(1);
  });
});
