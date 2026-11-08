import { Outlet } from 'react-router-dom';
import { AppShell, Container, Overlay } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';

import { useSyncColorScheme } from '@/core/theme';

import { AppBackground } from './components/AppBackground/AppBackground';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';

import type { FC } from 'react';

/** Ancho del navbar en desktop: lo usan `navbar.width` y `--app-shell-navbar-width`. */
const NAVBAR_WIDTH = '19rem';

/**
 * Shell de la app. El navbar pasa a panel pegado al borde (alto completo, redondeado a la derecha) desde el
 * breakpoint `md` (`62em`): el mismo valor está en `breakpoint` del navbar, en `useMediaQuery` y en
 * `appshell_navbar` de `theme/components.module.scss`; si cambia, cambian los tres.
 */
export const RootLayout: FC = () => {
  const [opened, { toggle, close }] = useDisclosure();
  const isDesktop = useMediaQuery('(min-width: 62em)', undefined, { getInitialValueInEffect: false });

  useSyncColorScheme();

  return (
    <AppShell
      padding={isDesktop ? '2xl' : 'md'}
      header={{ height: 60, collapsed: !!isDesktop }}
      navbar={{
        width: NAVBAR_WIDTH,
        breakpoint: 'md',
        collapsed: { mobile: !opened },
      }}
      layout="alt"
      withBorder={false}
      styles={{ root: { '--app-shell-navbar-width': NAVBAR_WIDTH } }}
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
