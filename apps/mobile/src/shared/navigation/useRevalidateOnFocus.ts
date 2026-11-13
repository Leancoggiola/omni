import { useIsFocused } from 'expo-router/react-navigation';
import { useEffect, useRef } from 'react';

/**
 * Llama a `revalidate` cuando la pantalla vuelve a tener foco. Las tabs quedan montadas y `AppState` solo avisa cuando
 * vuelve la app: sin esto, lo que cargó la otra persona mientras se miraba otra pestaña tardaría un intervalo entero
 * en aparecer. No hace nada al montar, porque ahí ya pide cada `useSWR`, y un fallo no se propaga: el error lo expone
 * el propio `useSWR`.
 */
export function useRevalidateOnFocus(revalidate: () => Promise<unknown>) {
  const isFocused = useIsFocused();
  const wasFocused = useRef(isFocused);

  useEffect(() => {
    if (isFocused && !wasFocused.current) void revalidate().catch(() => undefined);
    wasFocused.current = isFocused;
  }, [isFocused, revalidate]);
}
