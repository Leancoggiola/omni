import { useCallback, useEffect, useState } from 'react';

import type { WeatherCoordinates } from '@omni/shared/weather';

import { roundWeatherCoordinates, WEATHER_REFRESH_MS } from '@omni/shared/weather';

const GEOLOCATION_TIMEOUT_MS = 10_000;

export type DeviceLocation =
  | { status: 'locating' }
  | { status: 'granted'; coordinates: WeatherCoordinates }
  | { status: 'unavailable' };

const supportsGeolocation = () => typeof navigator !== 'undefined' && Boolean(navigator.geolocation);

/**
 * Posición del dispositivo con `navigator.geolocation`, redondeada a dos decimales antes de salir de este hook: la
 * ubicación exacta no llega a ningún otro lado. Pide el permiso al montar; si se niega, hay timeout o el navegador no
 * tiene geolocalización queda `unavailable` (no hay ciudad por defecto). `request` vuelve a intentarlo desde el botón.
 */
export function useDeviceLocation() {
  const [location, setLocation] = useState<DeviceLocation>(() =>
    supportsGeolocation() ? { status: 'locating' } : { status: 'unavailable' }
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!supportsGeolocation()) return;
    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (cancelled) return;
        const coordinates = roundWeatherCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
        setLocation({ status: 'granted', coordinates });
      },
      () => {
        if (!cancelled) setLocation({ status: 'unavailable' });
      },
      { maximumAge: WEATHER_REFRESH_MS, timeout: GEOLOCATION_TIMEOUT_MS }
    );

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const request = useCallback(() => {
    setLocation({ status: 'locating' });
    setAttempt(value => value + 1);
  }, []);

  return { location, request };
}
