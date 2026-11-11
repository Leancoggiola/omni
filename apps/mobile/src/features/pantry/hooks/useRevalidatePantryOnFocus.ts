import { useSWRConfig } from 'swr';

import { useRevalidateOnFocus } from '@/shared/navigation';

import { isPantryKey } from '@omni/shared/pantry';

/** Revalida todas las keys de la alacena al volver a la pestaña (`useRevalidateOnFocus`). */
export function useRevalidatePantryOnFocus() {
  const { mutate } = useSWRConfig();
  useRevalidateOnFocus(() => mutate(isPantryKey));
}
