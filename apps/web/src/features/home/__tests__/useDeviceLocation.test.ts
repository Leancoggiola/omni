import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeviceLocation } from '../hooks/useDeviceLocation';

import { act, renderHook, waitFor } from '@testing-library/react';

const getCurrentPosition = vi.fn();
const query = vi.fn();

describe('useDeviceLocation', () => {
  beforeEach(() => {
    getCurrentPosition.mockReset();
    query.mockReset().mockResolvedValue({ state: 'prompt' });
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });
    Object.defineProperty(navigator, 'permissions', { value: { query }, configurable: true });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'geolocation');
    Reflect.deleteProperty(navigator, 'permissions');
  });

  it('redondea la posición a dos decimales antes de exponerla', () => {
    getCurrentPosition.mockImplementation(success =>
      success({ coords: { latitude: -34.603722, longitude: -58.381592 } })
    );
    const { result } = renderHook(() => useDeviceLocation());
    expect(result.current.location).toEqual({
      status: 'granted',
      coordinates: { latitude: -34.6, longitude: -58.38 },
    });
  });

  it('queda "locating" hasta que el navegador responde', () => {
    const { result } = renderHook(() => useDeviceLocation());
    expect(result.current.location).toEqual({ status: 'locating' });
  });

  it('con el permiso negado una vez queda "unavailable" y todavía puede preguntar', async () => {
    getCurrentPosition.mockImplementation((_success, failure) => failure({ code: 1 }));
    const { result } = renderHook(() => useDeviceLocation());
    await waitFor(() => expect(result.current.location).toEqual({ status: 'unavailable', blocked: false }));
  });

  it('con el permiso bloqueado en el navegador queda "unavailable" y bloqueado', async () => {
    query.mockResolvedValue({ state: 'denied' });
    getCurrentPosition.mockImplementation((_success, failure) => failure({ code: 1 }));
    const { result } = renderHook(() => useDeviceLocation());
    await waitFor(() => expect(result.current.location).toEqual({ status: 'unavailable', blocked: true }));
    expect(query).toHaveBeenCalledWith({ name: 'geolocation' });
  });

  it('un timeout no consulta el permiso: no está bloqueado', async () => {
    getCurrentPosition.mockImplementation((_success, failure) => failure({ code: 3 }));
    const { result } = renderHook(() => useDeviceLocation());
    await waitFor(() => expect(result.current.location).toEqual({ status: 'unavailable', blocked: false }));
    expect(query).not.toHaveBeenCalled();
  });

  it('sin Permissions API no está bloqueado', async () => {
    Reflect.deleteProperty(navigator, 'permissions');
    getCurrentPosition.mockImplementation((_success, failure) => failure({ code: 1 }));
    const { result } = renderHook(() => useDeviceLocation());
    await waitFor(() => expect(result.current.location).toEqual({ status: 'unavailable', blocked: false }));
  });

  it('sin geolocalización en el navegador queda "unavailable" sin pedir nada', () => {
    Reflect.deleteProperty(navigator, 'geolocation');
    const { result } = renderHook(() => useDeviceLocation());
    expect(result.current.location).toEqual({ status: 'unavailable', blocked: false });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('request vuelve a pedir la posición', async () => {
    getCurrentPosition.mockImplementationOnce((_success, failure) => failure({ code: 1 }));
    const { result } = renderHook(() => useDeviceLocation());
    await waitFor(() => expect(result.current.location.status).toBe('unavailable'));
    getCurrentPosition.mockImplementationOnce(success => success({ coords: { latitude: 10.126, longitude: 20.004 } }));

    act(() => result.current.request());

    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(result.current.location).toEqual({ status: 'granted', coordinates: { latitude: 10.13, longitude: 20 } });
  });
});
