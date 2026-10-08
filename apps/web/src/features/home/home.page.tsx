import { Stack } from '@mantine/core';

import { HomeMainCard } from './modules/greeting';

import type { FC } from 'react';

export const HomePage: FC = () => {
  return (
    <Stack gap="md">
      <HomeMainCard />
    </Stack>
  );
};
