import { useEffect, useState } from 'react';
import useSWR from 'swr';

import { useAuth } from '@/core/auth';
import { api, SWR_KEYS } from '@/shared/api';

import { readLastWeather, saveLastWeather } from '../utils/lastWeather';
import { useDeviceLocation } from './useDeviceLocation';

import type { CurrentWeather } from '@omni/shared/weather';

import { WEATHER_REFRESH_MS } from '@omni/shared/weather';

export type WeatherState = 'loading' | 'no-location' | 'error' | 'ready';

type WeatherKey = readonly [path: string, latitude: number, longitude: number];

/**
 * Clima actual en la posición del dispositivo. Es un POST con las coordenadas en el body (no viajan en la URL), así
 * que la key de SWR las incluye y lleva su propio fetcher. Sin posición (permiso negado o sin geolocalización) no
 * llama a la API. Si la API falla y este navegador guardó un clima de hoy y de hace menos de 3 horas, lo muestra
 * como `stale` en vez de un error. Cada clima recibido se guarda para ese respaldo.
 */
export function useCurrentWeather() {
  const { user } = useAuth();
  const username = user?.username ?? null;
  const { location, request: requestLocation } = useDeviceLocation();
  const [savedWeather] = useState<CurrentWeather | null>(() => (username ? readLastWeather(username) : null));

  const key: WeatherKey | null =
    location.status === 'granted'
      ? [SWR_KEYS.weather.current, location.coordinates.latitude, location.coordinates.longitude]
      : null;

  const { data, error, mutate } = useSWR<CurrentWeather, Error, WeatherKey | null>(
    key,
    ([path, latitude, longitude]) => api.post<CurrentWeather>(path, { latitude, longitude }),
    { refreshInterval: WEATHER_REFRESH_MS, revalidateOnFocus: false }
  );

  useEffect(() => {
    if (!data || !username) return;
    saveLastWeather(username, data);
  }, [data, username]);

  const weather = data ?? (error ? savedWeather : null);

  const state: WeatherState = (() => {
    if (location.status === 'unavailable') return 'no-location';
    if (weather) return 'ready';
    if (error) return 'error';
    return 'loading';
  })();

  return { weather, state, error, retry: () => mutate(), requestLocation };
}
