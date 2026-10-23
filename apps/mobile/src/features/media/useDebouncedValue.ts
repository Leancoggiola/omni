import { useEffect, useState } from 'react';

/** `value` recién cuando deja de cambiar por `delay` ms (= `useDebouncedValue` de `@mantine/hooks`). */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
