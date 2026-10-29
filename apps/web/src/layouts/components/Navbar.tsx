import { useCallback, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  AppShell,
  Burger,
  Divider,
  Group,
  NavLink,
  Paper,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';

import { useAuth } from '@/core/auth';
import { ADMIN_NAV_ITEMS, MAIN_NAV_ITEMS } from '@/shared/navigation';
import { confirm, LogoAvatar, UserAvatar } from '@/shared/ui';
import { useDisplayStyles } from '@/shared/ui/useDisplayStyles';

import { ColorSchemeToggle } from './ColorSchemeToggle';

import type { NavItemConfig } from '@/shared/navigation';
import type { FC } from 'react';

import { SignOutIcon } from '@phosphor-icons/react';

interface NavbarProps {
  onClose: () => void;
  toggle: () => void;
}

export const Navbar: FC<NavbarProps> = ({ onClose, toggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const display = useDisplayStyles('md');
  /** Viewport del scroll de la lista: en pantallas bajas el efecto de abajo mantiene visible el ítem de la ruta actual. */
  const viewportRef = useRef<HTMLDivElement>(null);
  const loggingOut = useRef(false);

  const handleLogout = useCallback(async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    try {
      const confirmed = await confirm({
        title: '¿Cerrar sesión?',
        description: 'Vas a tener que volver a iniciar sesión para entrar a Omni.',
        confirmLabel: 'Cerrar sesión',
        destructive: false,
      });
      if (!confirmed) return;
      await logout();
      navigate('/login', { replace: true });
    } finally {
      loggingOut.current = false;
    }
  }, [logout, navigate]);

  const isActive = useCallback(
    (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)),
    [location.pathname]
  );

  useEffect(() => {
    viewportRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [location.pathname]);

  /** Sin destino no hay `href`: `role="link"` + `aria-disabled` es el patrón ARIA de link deshabilitado. */
  const renderNavItem = (item: NavItemConfig) => {
    const renderIcon = (active: boolean) => (
      <ThemeIcon variant={active ? 'white' : 'light'} color="brand" size="lg" radius="full">
        {item.icon}
      </ThemeIcon>
    );

    if (item.disabled || !item.path) {
      return (
        <NavLink
          key={item.label}
          label={item.label}
          leftSection={renderIcon(false)}
          disabled
          role="link"
          aria-disabled
        />
      );
    }

    const active = isActive(item.path);

    return (
      <NavLink
        key={item.label}
        component={Link}
        to={item.path}
        label={item.label}
        leftSection={renderIcon(active)}
        active={active}
        aria-current={active ? 'page' : undefined}
        onClick={onClose}
      />
    );
  };

  return (
    <AppShell.Navbar px="md" py="xl">
      <AppShell.Section my="sm">
        <Group>
          <LogoAvatar size="lg" />
          <Stack gap="none">
            <Text {...display}>Omni</Text>
            <Text c="dimmed" size="xs">
              Hub personal
            </Text>
          </Stack>
          <Burger opened onClick={toggle} hiddenFrom="md" size="sm" ml="auto" />
        </Group>
      </AppShell.Section>
      <Divider color="var(--mantine-color-border-hairline)" />
      <AppShell.Section grow my="md" component={ScrollArea} type="auto" viewportRef={viewportRef}>
        <Stack gap="2xs">
          {MAIN_NAV_ITEMS.map(renderNavItem)}
          {user?.role === 'ADMIN' && (
            <>
              <Text size="xs" tt="uppercase" c="dimmed" fw={700} mt="sm" mb="2xs" px="sm">
                Admin
              </Text>
              {ADMIN_NAV_ITEMS.map(renderNavItem)}
            </>
          )}
        </Stack>
      </AppShell.Section>
      <Divider color="var(--mantine-color-border-hairline)" />

      <AppShell.Section mt="md">
        <Paper p="sm" shadow="none" radius="lg" bg="var(--mantine-color-surfaces-hover)">
          <Group gap="sm" wrap="nowrap">
            <UserAvatar name={user?.name ?? ''} src={user?.avatarUrl} />
            <Stack gap="none">
              <Text size="sm" fw={600}>
                {user?.name ?? '—'}
              </Text>
              <Text size="xs" c="dimmed">
                {user?.email ?? '—'}
              </Text>
            </Stack>
            <Group ml="auto" gap="2xs" wrap="nowrap">
              <ColorSchemeToggle />
              <ActionIcon variant="subtle" size="lg" aria-label="Cerrar sesión" onClick={handleLogout}>
                <SignOutIcon size="1rem" />
              </ActionIcon>
            </Group>
          </Group>
        </Paper>
      </AppShell.Section>
    </AppShell.Navbar>
  );
};
