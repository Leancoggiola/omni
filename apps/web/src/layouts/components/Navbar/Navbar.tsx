import { useCallback } from 'react';
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

import { ADMIN_NAV_ITEMS, MAIN_NAV_ITEMS } from '@/app/navigation/nav-registry';
import { useAuth } from '@/core/auth';
import { LogoAvatar, UserAvatar } from '@/shared/ui';

import { ColorSchemeToggle } from '../ColorSchemeToggle';

import type { NavItemConfig } from '@/layouts/navConfig';
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

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  const isActive = useCallback(
    (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)),
    [location.pathname]
  );

  const renderNavItem = (item: NavItemConfig) => {
    const renderIcon = (active: boolean) => (
      <ThemeIcon variant={active ? 'white' : 'filled'} color="brand" size="lg" radius="md">
        {item.icon}
      </ThemeIcon>
    );

    // Sin destino no hay `href`: `role="link"` + `aria-disabled` es el patrón ARIA de link deshabilitado.
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
            <Text size="lg" fw={600}>
              Omni
            </Text>
            <Text c="dimmed" size="xs">
              Hub personal
            </Text>
          </Stack>
          <Burger opened onClick={toggle} hiddenFrom="md" size="sm" ml="auto" />
        </Group>
      </AppShell.Section>
      <Divider />
      <AppShell.Section grow my="md" component={ScrollArea}>
        <Stack gap="2xs">
          {MAIN_NAV_ITEMS.map(renderNavItem)}
          {user?.role === 'ADMIN' && (
            <>
              <Text size="xs" tt="uppercase" c="dimmed" fw={600} mt="sm" mb="2xs" px="sm">
                Admin
              </Text>
              {ADMIN_NAV_ITEMS.map(renderNavItem)}
            </>
          )}
        </Stack>
      </AppShell.Section>
      <Divider />

      <AppShell.Section mt="md">
        <Paper p="sm" bg="var(--mantine-color-surfaces-hover)">
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
