import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { ignoreError } from '@omni/shared/common';
import { roundWeatherCoordinates, WEATHER_REFRESH_MS } from '@omni/shared/weather';

import type { WeatherCoordinates } from '@omni/shared/weather';

const LOCATION_TIMEOUT_MS = 10_000;

/** Rechaza si `promise` no resuelve en `ms` (el GPS puede no responder nunca) y siempre libera el temporizador. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Tiempo de espera agotado')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export type DeviceLocation =
  | { status: 'locating' }
  | { status: 'granted'; coordinates: WeatherCoordinates }
  | { status: 'unavailable'; canAskAgain: boolean };

/**
 * Posición del dispositivo con `expo-location` (= `useDeviceLocation` de web), redondeada a dos decimales antes de
 * salir de este hook: la ubicación exacta no llega a ningún otro lado. Pide el permiso en primer plano al montar; si
 * se niega, el servicio está apagado o no hay posición queda `unavailable` (no hay ciudad por defecto). Con
 * `Accuracy.Low` alcanza, porque después se redondea a ~1 km. `request` vuelve a pedir el permiso, o abre los ajustes
 * si el sistema ya no deja preguntar (`canAskAgain` en `false`); en ese caso, al volver a primer plano re-evalúa el permiso
 * sin pedirlo, así la card se recupera si la persona lo habilitó en los ajustes.
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
        (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }), LOCATION_TIMEOUT_MS));
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

  const canOnlyOpenSettings = location.status === 'unavailable' && !location.canAskAgain;

  useEffect(() => {
    if (!canOnlyOpenSettings) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setAttempt(value => value + 1);
    });
    return () => subscription.remove();
  }, [canOnlyOpenSettings]);

  const request = useCallback(() => {
    if (location.status === 'unavailable' && !location.canAskAgain) {
      Linking.openSettings().catch(ignoreError);
      return;
    }
    setLocation({ status: 'locating' });
    setAttempt(value => value + 1);
  }, [location]);

  return { location, request };
}
