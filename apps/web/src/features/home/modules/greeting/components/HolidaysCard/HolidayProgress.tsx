import { useEffect, useState } from 'react';
import { Progress } from '@mantine/core';

import { useIsDark } from '@/theme/useIsDark';

type HolidayProgressProps = {
  duration?: number;
};

export function HolidayProgress({ duration = 3000 }: HolidayProgressProps) {
  const [value, setValue] = useState(0);
  const isDark = useIsDark();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setValue(100);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <Progress
      value={value}
      transitionDuration={duration}
      size="xs"
      color={isDark ? 'white' : 'brand'}
      bg="transparent"
    />
  );
}
