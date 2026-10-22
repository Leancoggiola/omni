import { useCallback, useEffect, useState } from 'react';
import { useReducedMotion } from '@mantine/hooks';

import { clampCarouselIndex, nextCarouselIndex } from '@omni/shared/holidays';

interface HolidayCarouselOptions {
  /** Frena el auto-avance (hover o foco dentro de la card). `next` sigue funcionando. */
  paused?: boolean;
}

export function useHolidayCarousel<T>(items: T[], duration: number, { paused = false }: HolidayCarouselOptions = {}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const count = items.length;

  const safeIndex = clampCarouselIndex(currentIndex, count);

  const next = useCallback(() => {
    setCurrentIndex(prev => nextCarouselIndex(prev, count));
  }, [count]);

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
