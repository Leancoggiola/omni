import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { FONT_SIZE, RADIUS } from '@omni/shared/theme';
import { MOBILE_TAB_KEYS, NAV_REGISTRY } from '@omni/shared/navigation';
import { Tabs } from 'expo-router';
import { type Icon } from 'phosphor-react-native';
import { Paragraph, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';
import { MeasuredTabBar, MORE_TAB, NAV_ICONS, TAB_ROUTES } from '@/shared/navigation';

import type { NavKey } from '@omni/shared/navigation';

const PILL = { width: 56, height: 30 } as const;
const ICON_SIZE = 22;

function TabLabel({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  return (
    <Paragraph fontSize={FONT_SIZE.sm} fontWeight={focused ? '700' : '500'} color={color}>
      {label}
    </Paragraph>
  );
}

/** El tab activo lleva el ícono relleno sobre una pill, como el ítem activo del navbar de web. */
function TabIcon({ icon: IconComponent, focused, color }: { icon: Icon; focused: boolean; color: string }) {
  return (
    <YStack
      width={PILL.width}
      height={PILL.height}
      borderRadius={RADIUS.full}
      backgroundColor={focused ? '$primarySurface' : 'transparent'}
      alignItems="center"
      justifyContent="center"
    >
      <IconComponent size={ICON_SIZE} color={color} weight={focused ? 'fill' : 'regular'} />
    </YStack>
  );
}

function tabOptions(label: string, icon: Icon) {
  return {
    title: label,
    tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
      <TabIcon icon={icon} focused={focused} color={color} />
    ),
    tabBarLabel: ({ focused, color }: { focused: boolean; color: string }) => (
      <TabLabel label={label} focused={focused} color={color} />
    ),
  };
}

const renderTabBar = (props: BottomTabBarProps) => <MeasuredTabBar {...props} />;

const tabLabel = (key: NavKey) => NAV_REGISTRY[key].shortLabel ?? NAV_REGISTRY[key].label;

// No dependen del tema (el color llega por props): se arman una vez y no en cada render del layout.
const TAB_SCREENS = MOBILE_TAB_KEYS.map(key => ({
  name: TAB_ROUTES[key],
  options: tabOptions(tabLabel(key), NAV_ICONS[key]),
}));
const MORE_OPTIONS = tabOptions(MORE_TAB.label, MORE_TAB.icon);

export default function TabsLayout() {
  const colors = useSemanticColors();

  return (
    // Sin header de navegación: cada pantalla trae su `ScreenHeader` (evita el título duplicado).
    <Tabs
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.dimmed,
        tabBarIconStyle: PILL,
      }}
    >
      {TAB_SCREENS.map(({ name, options }) => (
        <Tabs.Screen key={name} name={name} options={options} />
      ))}
      <Tabs.Screen name={MORE_TAB.route} options={MORE_OPTIONS} />
    </Tabs>
  );
}
