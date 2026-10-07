import { useEffect, useState } from 'react';
import { Progress } from '@mantine/core';

import { useIsDark } from '@/theme/useIsDark';

type HolidayProgressProps = {
  duration?: number;
  /** Con el carrusel en pausa (hover, foco o reduced motion) la barra queda vacía. */
  running?: boolean;
};

export function HolidayProgress({ duration = 3000, running = true }: HolidayProgressProps) {
  const [value, setValue] = useState(0);
  const isDark = useIsDark();

  useEffect(() => {
    if (!running) return;

    const frame = requestAnimationFrame(() => {
      setValue(100);
    });

    return () => cancelAnimationFrame(frame);
  }, [running]);

  return (
    <Progress
      value={value}
      transitionDuration={duration}
      size="xs"
      // Sobre el gradiente de la card: primario relleno en claro, blanco de superficie en oscuro.
      color={isDark ? 'var(--mantine-color-surfaces-white)' : 'var(--mantine-primary-color-filled)'}
      bg="transparent"
    />
  );
}
