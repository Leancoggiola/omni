import { useIsFocused } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

import { useAuth } from '@/core/auth';
import { api, API_KEYS } from '@/shared/api';
import { WEATHER_REFRESH_MS } from '@omni/shared/weather';

import { readLastWeather, saveLastWeather } from '../utils/lastWeather';
import { useDeviceLocation } from './useDeviceLocation';

import type { CurrentWeather } from '@omni/shared/weather';

export type WeatherState = 'loading' | 'no-location' | 'error' | 'ready';

type WeatherKey = readonly [path: string, latitude: number, longitude: number];

/**
 * Clima actual en la posición del dispositivo (= `useCurrentWeather` de web). Es un POST con las coordenadas en el
 * body (no viajan en la URL), así que la key de SWR las incluye y lleva su propio fetcher. Sin posición (permiso
 * negado o sin servicio) no llama a la API. Si la API falla y este dispositivo guardó un clima de hoy y de hace menos
 * de 3 horas, lo muestra como `stale` en vez de un error; lo lee (y lo valida contra la hora actual) recién cuando
 * aparece el error. Se refresca cada `WEATHER_REFRESH_MS` (15 minutos: lo que dura el caché de la API, antes no cambia) solo con la
 * pantalla enfocada.
 */
export function useCurrentWeather() {
  const { user } = useAuth();
  const username = user?.username ?? null;
  const isFocused = useIsFocused();
  const { location, request: requestLocation } = useDeviceLocation();

  const key: WeatherKey | null =
    location.status === 'granted'
      ? [API_KEYS.weather.current, location.coordinates.latitude, location.coordinates.longitude]
      : null;

  const { data, error, mutate } = useSWR<CurrentWeather, Error, WeatherKey | null>(
    key,
    ([path, latitude, longitude]) => api.post<CurrentWeather>(path, { latitude, longitude }),
    { refreshInterval: isFocused ? WEATHER_REFRESH_MS : 0 }
  );

  const [savedWeather, setSavedWeather] = useState<CurrentWeather | null>(null);

  useEffect(() => {
    if (!username || !error) return;
    let cancelled = false;
    void readLastWeather(username).then(saved => {
      if (!cancelled) setSavedWeather(saved);
    });
    return () => {
      cancelled = true;
    };
  }, [username, error]);

  useEffect(() => {
    if (data && username) void saveLastWeather(username, data);
  }, [data, username]);

  const weather = data ?? (error ? savedWeather : null);

  const state: WeatherState = (() => {
    if (location.status === 'unavailable') return 'no-location';
    if (weather) return 'ready';
    if (error) return 'error';
    return 'loading';
  })();

  const canAskLocationAgain = location.status !== 'unavailable' || location.canAskAgain;

  return { weather, state, error, retry: () => void mutate(), requestLocation, canAskLocationAgain };
}
