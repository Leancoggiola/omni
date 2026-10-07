import { useCallback, useEffect, useState } from 'react';

export function useHolidayCarousel<T>(items: T[], duration = 3000) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = useCallback(() => {
    setCurrentIndex(prev => {
      if (items.length === 0) {
        return 0;
      }

      return (prev + 1) % items.length;
    });
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) {
      return;
    }

    const timeout = setTimeout(next, duration);

    return () => clearTimeout(timeout);
  }, [currentIndex, items.length, duration, next]);

  return {
    currentIndex,
    currentItem: items[currentIndex],
    next,
  };
}
