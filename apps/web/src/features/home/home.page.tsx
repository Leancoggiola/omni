import { Box, Stack } from '@mantine/core';

import { HomeMainCard } from './components/HomeMainCard';
import { WatchingCard } from './components/WatchingCard';

import type { FC } from 'react';

/** Inicio: la card principal (saludo y efemérides) y debajo la grilla de widgets, hoy solo "Seguís viendo". */
export const HomePage: FC = () => {
  return (
    <Stack gap="md">
      <HomeMainCard />
      <Box
        display="grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22.5rem), 1fr))',
          gap: 'var(--mantine-spacing-md)',
          alignItems: 'start',
        }}
      >
        <WatchingCard />
      </Box>
    </Stack>
  );
};
