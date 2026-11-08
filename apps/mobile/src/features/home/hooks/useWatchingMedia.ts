import { useIsFocused } from '@react-navigation/native';
import { useMemo } from 'react';
import useSWR from 'swr';

import { API_KEYS } from '@/shared/api';

import { MEDIA_LIST_REFRESH_MS, takeMediaByStatus } from '@omni/shared/media';

import type { MediaItem } from '@omni/shared/media';

export const WATCHING_LIMIT = 3;

/**
 * Los últimos `WATCHING_LIMIT` ítems "Viendo" de la lista del usuario (= `useWatchingMedia` de web). `home` no puede
 * importar `media`, así que pide la misma key de la lista (una sola cache SWR) y filtra con `takeMediaByStatus`. Se
 * refresca cada `MEDIA_LIST_REFRESH_MS` solo con la pantalla enfocada.
 */
export function useWatchingMedia() {
  const isFocused = useIsFocused();
  const { data, error, isLoading, mutate } = useSWR<MediaItem[]>(API_KEYS.media.list, {
    refreshInterval: isFocused ? MEDIA_LIST_REFRESH_MS : 0,
  });

  const items = useMemo(() => (data ? takeMediaByStatus(data, 'watching', WATCHING_LIMIT) : []), [data]);

  return { items, isLoading: isLoading && !data, error, retry: () => void mutate() };
}
