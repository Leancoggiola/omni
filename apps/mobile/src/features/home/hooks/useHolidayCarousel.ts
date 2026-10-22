import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { clampCarouselIndex, nextCarouselIndex } from '@omni/shared/holidays';

/**
 * Carrusel de efemérides (= `useHolidayCarousel` de web): avanza solo cada `duration` ms mientras haya más de un ítem.
 * Con "reducir movimiento" del sistema no avanza solo (`isAutoPlaying` false), también si se activa con la pantalla
 * abierta; `next` sigue funcionando para avanzar a mano.
 */
export function useHolidayCarousel<T>(items: T[], duration: number) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(useReducedMotion());
  const count = items.length;

  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  const safeIndex = clampCarouselIndex(currentIndex, count);

  const next = useCallback(() => {
    setCurrentIndex(prev => nextCarouselIndex(prev, count));
  }, [count]);

  const isAutoPlaying = count > 1 && !reduceMotion;

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
