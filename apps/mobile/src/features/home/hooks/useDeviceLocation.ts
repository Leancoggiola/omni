import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { roundWeatherCoordinates, WEATHER_REFRESH_MS } from '@omni/shared/weather';

import type { WeatherCoordinates } from '@omni/shared/weather';

export type DeviceLocation =
  | { status: 'locating' }
  | { status: 'granted'; coordinates: WeatherCoordinates }
  | { status: 'unavailable'; canAskAgain: boolean };

/**
 * Posición del dispositivo con `expo-location` (= `useDeviceLocation` de web), redondeada a dos decimales antes de
 * salir de este hook: la ubicación exacta no llega a ningún otro lado. Pide el permiso en primer plano al montar; si
 * se niega, el servicio está apagado o no hay posición queda `unavailable` (no hay ciudad por defecto). Con
 * `Accuracy.Low` alcanza, porque después se redondea a ~1 km. `request` vuelve a pedir el permiso, o abre los ajustes
 * si el sistema ya no deja preguntar (`canAskAgain` en `false`).
 */
export function useDeviceLocation() {
  const [location, setLocation] = useState<DeviceLocation>({ status: 'locating' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function locate(): Promise<DeviceLocation> {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return { status: 'unavailable', canAskAgain: permission.canAskAgain };
      const position =
        (await Location.getLastKnownPositionAsync({ maxAge: WEATHER_REFRESH_MS })) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
      const { latitude, longitude } = position.coords;
      return { status: 'granted', coordinates: roundWeatherCoordinates({ latitude, longitude }) };
    }

    locate()
      .catch((): DeviceLocation => ({ status: 'unavailable', canAskAgain: true }))
      .then(next => {
        if (!cancelled) setLocation(next);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const request = useCallback(() => {
    if (location.status === 'unavailable' && !location.canAskAgain) {
      Linking.openSettings().catch(() => {});
      return;
    }
    setLocation({ status: 'locating' });
    setAttempt(value => value + 1);
  }, [location]);

  return { location, request };
}
