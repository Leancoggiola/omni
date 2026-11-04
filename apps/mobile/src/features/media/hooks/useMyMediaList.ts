import { useIsFocused } from '@react-navigation/native';
import useSWR from 'swr';

import { API_KEYS } from '@/shared/api';

import { MEDIA_LIST_REFRESH_MS } from '@omni/shared/media';

import type { MediaItem } from '@omni/shared/media';

/**
 * La lista completa en una sola key: los filtros se aplican en el cliente (`filterMediaItems`), igual
 * que web. Así "ya en tu lista" ve todos los títulos aunque haya un filtro activo. Es compartida con la pareja:
 * revalida al volver a primer plano y se refresca cada `MEDIA_LIST_REFRESH_MS` solo con la pantalla enfocada
 * y la app activa (`isVisible` del `SWRProvider`).
 */
export function useMyMediaList() {
  const isFocused = useIsFocused();
  const { data, error, isLoading, mutate } = useSWR<MediaItem[]>(API_KEYS.media.list, {
    refreshInterval: isFocused ? MEDIA_LIST_REFRESH_MS : 0,
  });
  return { data, error, isLoading, mutate };
}
