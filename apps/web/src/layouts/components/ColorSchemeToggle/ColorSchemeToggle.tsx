import { ActionIcon } from '@mantine/core';
import { useComputedColorScheme, useMantineColorScheme } from '@mantine/core';

import { setSessionColorScheme } from '@/core/theme';

import type { FC } from 'react';

import { MoonIcon, SunIcon } from '@phosphor-icons/react';

export const ColorSchemeToggle: FC = () => {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light');

  const toggle = () => {
    const next = computedColorScheme === 'dark' ? 'light' : 'dark';
    setSessionColorScheme(next);
    setColorScheme(next);
  };

  return (
    <ActionIcon
      variant="subtle"
      size="lg"
      onClick={toggle}
      aria-label={computedColorScheme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      {computedColorScheme === 'dark' ? <SunIcon size="1rem" /> : <MoonIcon size="1rem" />}
    </ActionIcon>
  );
};
