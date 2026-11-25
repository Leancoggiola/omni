import { render } from '@testing-library/react-native';

import TabsLayout from '../../../app/(tabs)/_layout';

import { MORE_CHILD_ROUTES, MORE_TAB, TAB_ROUTES } from './tabs';

import type { ReactNode } from 'react';

type ScreenProps = { name: string; options?: Record<string, unknown> };

const mockScreens: ScreenProps[] = [];

jest.mock('expo-router', () => {
  const Tabs = ({ children }: { children: ReactNode }) => children;
  Tabs.Screen = function Screen(props: ScreenProps) {
    mockScreens.push(props);
    return null;
  };
  return { Tabs };
});
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('@/shared/ui', () => ({ Paragraph: () => null }));
jest.mock('@/shared/navigation', () => ({
  ...jest.requireActual('@/shared/navigation/tabs'),
  FloatingTabBar: () => null,
  NAV_ICONS: {},
}));

beforeEach(() => {
  mockScreens.length = 0;
});

describe('layout de las tabs', () => {
  it('declara las tabs, "Más" y las rutas sin tab, en ese orden', async () => {
    await render(<TabsLayout />);

    expect(mockScreens.map(screen => screen.name)).toEqual([
      ...Object.values(TAB_ROUTES),
      MORE_TAB.route,
      ...MORE_CHILD_ROUTES,
    ]);
  });

  it('no oculta con `href` las rutas sin tab: expo-router redirige a Inicio al enfocar una tab oculta', async () => {
    await render(<TabsLayout />);

    for (const screen of mockScreens.filter(item => MORE_CHILD_ROUTES.includes(item.name))) {
      expect(screen.options?.href).toBeUndefined();
    }
  });
});
