import { useIsFocused } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { useSWRConfig } from 'swr';

import { isPantryKey } from '@omni/shared/pantry';

/**
 * Revalida la alacena al volver a la pestaña. Las tabs quedan montadas y `AppState` solo avisa cuando vuelve la app:
 * sin esto, lo que cargó la otra persona mientras se miraba otra pestaña tardaría un intervalo entero en aparecer. No
 * pide nada al montar, porque ahí ya lo hace cada `useSWR`.
 */
export function useRevalidatePantryOnFocus() {
  const isFocused = useIsFocused();
  const { mutate } = useSWRConfig();
  const wasFocused = useRef(isFocused);

  useEffect(() => {
    if (isFocused && !wasFocused.current) void mutate(isPantryKey).catch(() => undefined);
    wasFocused.current = isFocused;
  }, [isFocused, mutate]);
}
