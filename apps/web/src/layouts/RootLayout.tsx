import { Outlet } from 'react-router-dom';
import { AppShell, Container, Overlay } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';

import { useSyncColorScheme } from '@/core/theme';

import { AppBackground } from './components/AppBackground/AppBackground';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';

import type { FC } from 'react';

export const RootLayout: FC = () => {
  const [opened, { toggle, close }] = useDisclosure();
  const isDesktop = useMediaQuery('(min-width: 62em)', undefined, { getInitialValueInEffect: false });

  useSyncColorScheme();

  return (
    <AppShell
      padding={isDesktop ? '2xl' : 'md'}
      header={{ height: 60, collapsed: !!isDesktop }}
      navbar={{
        width: '20rem',
        breakpoint: 'md',
        collapsed: { mobile: !opened },
      }}
      layout="alt"
      withBorder={false}
      styles={{ root: { '--app-shell-navbar-width': '20rem' } }}
    >
      <AppBackground />
      <Header opened={opened} onToggle={toggle} />
      <Navbar onClose={close} toggle={toggle} />

      <AppShell.Main>
        <Container>
          <Overlay hiddenFrom="md" hidden={!opened} backgroundOpacity={0.69} blur={2} zIndex={100} />
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
};
