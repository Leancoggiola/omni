import * as Location from 'expo-location';
import { Linking } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useDeviceLocation } from './useDeviceLocation';

jest.mock('expo-location', () => ({
  Accuracy: { Low: 2 },
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mocked = jest.mocked(Location);

const position = (latitude: number, longitude: number) =>
  ({ coords: { latitude, longitude } }) as Location.LocationObject;
const permission = (granted: boolean, canAskAgain = true) =>
  ({ granted, canAskAgain }) as Location.LocationPermissionResponse;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getLastKnownPositionAsync.mockResolvedValue(null);
});

describe('useDeviceLocation', () => {
  it('con permiso redondea la posición a dos decimales', async () => {
    mocked.requestForegroundPermissionsAsync.mockResolvedValue(permission(true));
    mocked.getCurrentPositionAsync.mockResolvedValue(position(-34.603722, -58.381592));

    const { result } = renderHook(() => useDeviceLocation());
    expect(result.current.location).toEqual({ status: 'locating' });

    await waitFor(() =>
      expect(result.current.location).toEqual({
        status: 'granted',
        coordinates: { latitude: -34.6, longitude: -58.38 },
      })
    );
    expect(mocked.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: Location.Accuracy.Low });
  });

  it('prefiere la última posición conocida antes de pedir una nueva', async () => {
    mocked.requestForegroundPermissionsAsync.mockResolvedValue(permission(true));
    mocked.getLastKnownPositionAsync.mockResolvedValue(position(-32.944, -60.65));

    const { result } = renderHook(() => useDeviceLocation());

    await waitFor(() => expect(result.current.location.status).toBe('granted'));
    expect(mocked.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('con el permiso negado queda unavailable y no pide la posición', async () => {
    mocked.requestForegroundPermissionsAsync.mockResolvedValue(permission(false));

    const { result } = renderHook(() => useDeviceLocation());

    await waitFor(() => expect(result.current.location).toEqual({ status: 'unavailable', canAskAgain: true }));
    expect(mocked.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('si falla obtener la posición (servicio apagado) queda unavailable', async () => {
    mocked.requestForegroundPermissionsAsync.mockResolvedValue(permission(true));
    mocked.getCurrentPositionAsync.mockRejectedValue(new Error('Location services are disabled'));

    const { result } = renderHook(() => useDeviceLocation());

    await waitFor(() => expect(result.current.location.status).toBe('unavailable'));
  });

  it('si el GPS no responde en 10 s queda unavailable y deja volver a pedir el permiso', async () => {
    jest.useFakeTimers();
    try {
      mocked.requestForegroundPermissionsAsync.mockResolvedValue(permission(true));
      mocked.getCurrentPositionAsync.mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useDeviceLocation());
      await act(async () => {});
      expect(result.current.location).toEqual({ status: 'locating' });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(10_000);
      });

      expect(result.current.location).toEqual({ status: 'unavailable', canAskAgain: true });
    } finally {
      jest.useRealTimers();
    }
  });

  it('request vuelve a pedir el permiso', async () => {
    mocked.requestForegroundPermissionsAsync.mockResolvedValueOnce(permission(false));
    const { result } = renderHook(() => useDeviceLocation());
    await waitFor(() => expect(result.current.location.status).toBe('unavailable'));
    mocked.requestForegroundPermissionsAsync.mockResolvedValueOnce(permission(true));
    mocked.getCurrentPositionAsync.mockResolvedValue(position(10.126, 20.004));

    act(() => result.current.request());

    await waitFor(() =>
      expect(result.current.location).toEqual({ status: 'granted', coordinates: { latitude: 10.13, longitude: 20 } })
    );
  });

  it('si el sistema ya no deja preguntar, request abre los ajustes en vez de pedir de nuevo', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    mocked.requestForegroundPermissionsAsync.mockResolvedValue(permission(false, false));
    const { result } = renderHook(() => useDeviceLocation());
    await waitFor(() => expect(result.current.location).toEqual({ status: 'unavailable', canAskAgain: false }));

    act(() => result.current.request());

    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(mocked.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});
