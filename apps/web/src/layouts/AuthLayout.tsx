import { Outlet } from 'react-router-dom';
import { AppShell, Container } from '@mantine/core';

import { AnimatedBackground } from './components/AnimatedBackground';

import type { FC } from 'react';

export const AuthLayout: FC = () => {
  return (
    <AppShell padding="md">
      <AppShell.Main
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          placeItems: 'center',
        }}
      >
        <AnimatedBackground />
        <Container w="100%">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
};
