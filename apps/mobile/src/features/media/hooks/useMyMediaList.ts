import useSWR from 'swr';

import { API_KEYS } from '@/shared/api';

import type { MediaItem } from '@omni/shared/media';

/**
 * La lista completa en una sola key: los filtros se aplican en el cliente (`filterMediaItems`), igual
 * que web. Así "ya en tu lista" ve todos los títulos aunque haya un filtro activo.
 */
export function useMyMediaList() {
  const { data, error, isLoading, mutate } = useSWR<MediaItem[]>(API_KEYS.media.list);
  return { data, error, isLoading, mutate };
}
