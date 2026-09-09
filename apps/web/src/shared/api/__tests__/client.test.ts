import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../client';
import { SWR_KEYS } from '../keys';
import { clearOnAuthFailure, setOnAuthFailure } from '../refreshSession';

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearOnAuthFailure();
  });

  it('returns parsed json on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      })
    );

    await expect(api.post('/api/resource', { a: 1 })).resolves.toEqual({ ok: true });
  });

  it('returns undefined on 204 No Content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      })
    );

    await expect(api.delete('/api/resource')).resolves.toBeUndefined();
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

    await expect(api.post('/api/resource')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Invalid',
      status: 400,
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
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: 'ok' }) });
      })
    );

    await expect(api.post('/api/resource', { a: 1 })).resolves.toEqual({ data: 'ok' });
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

    await expect(api.patch('/api/resource', {})).rejects.toMatchObject({ status: 401 });
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it('does not attempt refresh when login itself returns 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ message: 'Credenciales inválidas' }),
      })
    );

    await expect(api.post(SWR_KEYS.auth.login, { username: 'x', password: 'y' })).rejects.toMatchObject({
      status: 401,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
