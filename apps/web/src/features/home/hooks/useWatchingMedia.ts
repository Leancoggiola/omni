import { useMemo } from 'react';
import useSWR from 'swr';

import { SWR_KEYS } from '@/shared/api';

import type { MediaItem } from '@omni/shared/media';

import { MEDIA_LIST_REFRESH_MS, takeMediaByStatus } from '@omni/shared/media';

export const WATCHING_LIMIT = 3;

/**
 * Los últimos `WATCHING_LIMIT` ítems "Viendo" de la lista del usuario. `home` no puede importar `media`, así que pide
 * la misma key de la lista (la cache SWR es una sola) y filtra con `takeMediaByStatus`. Es la lista compartida con la
 * pareja: revalida al enfocar la pestaña y se refresca cada `MEDIA_LIST_REFRESH_MS`.
 */
export function useWatchingMedia() {
  const { data, isLoading, error, mutate } = useSWR<MediaItem[]>(SWR_KEYS.media.list, {
    revalidateOnFocus: true,
    refreshInterval: MEDIA_LIST_REFRESH_MS,
  });

  const items = useMemo(() => (data ? takeMediaByStatus(data, 'watching', WATCHING_LIMIT) : []), [data]);

  return { items, isLoading: isLoading && !data, error, mutate };
}
