import { useCallback, useEffect, useState } from 'react';
import { useReducedMotion } from '@mantine/hooks';

interface HolidayCarouselOptions {
  /** Frena el auto-avance (hover o foco dentro de la card). `next` sigue funcionando. */
  paused?: boolean;
}

export function useHolidayCarousel<T>(items: T[], duration = 3000, { paused = false }: HolidayCarouselOptions = {}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const count = items.length;

  // Si la lista se achica (refetch del día nuevo), el índice guardado puede quedar fuera de rango.
  const safeIndex = count ? currentIndex % count : 0;

  const next = useCallback(() => {
    setCurrentIndex(prev => (count === 0 ? 0 : ((prev % count) + 1) % count));
  }, [count]);

  // Con `prefers-reduced-motion` no rota solo: el usuario avanza con click o teclado.
  const isAutoPlaying = count > 1 && !paused && !reduceMotion;

  useEffect(() => {
    if (!isAutoPlaying) {
      return;
    }

    const timeout = setTimeout(next, duration);

    return () => clearTimeout(timeout);
  }, [safeIndex, isAutoPlaying, duration, next]);

  return {
    currentIndex: safeIndex,
    currentItem: items[safeIndex],
    isAutoPlaying,
    next,
  };
}
