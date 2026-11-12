import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeviceLocation } from '../hooks/useDeviceLocation';

import { act, renderHook } from '@testing-library/react';

const getCurrentPosition = vi.fn();

describe('useDeviceLocation', () => {
  beforeEach(() => {
    getCurrentPosition.mockReset();
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'geolocation');
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

  it('con el permiso negado queda "unavailable"', () => {
    getCurrentPosition.mockImplementation((_success, failure) => failure({ code: 1 }));
    const { result } = renderHook(() => useDeviceLocation());
    expect(result.current.location).toEqual({ status: 'unavailable' });
  });

  it('sin geolocalización en el navegador queda "unavailable" sin pedir nada', () => {
    Reflect.deleteProperty(navigator, 'geolocation');
    const { result } = renderHook(() => useDeviceLocation());
    expect(result.current.location).toEqual({ status: 'unavailable' });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('request vuelve a pedir la posición', () => {
    getCurrentPosition.mockImplementationOnce((_success, failure) => failure({ code: 1 }));
    const { result } = renderHook(() => useDeviceLocation());
    getCurrentPosition.mockImplementationOnce(success => success({ coords: { latitude: 10.126, longitude: 20.004 } }));

    act(() => result.current.request());

    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(result.current.location).toEqual({ status: 'granted', coordinates: { latitude: 10.13, longitude: 20 } });
  });
});
