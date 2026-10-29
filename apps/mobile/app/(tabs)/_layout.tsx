import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { FONT_SIZE } from '@omni/shared/theme';
import { MOBILE_TAB_KEYS, NAV_REGISTRY } from '@omni/shared/navigation';
import { Tabs } from 'expo-router';
import { type Icon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import { Paragraph } from 'tamagui';

import { useSemanticColors } from '@/core/theme';
import { FloatingTabBar, MORE_TAB, NAV_ICONS, TAB_ROUTES } from '@/shared/navigation';

import type { NavKey } from '@omni/shared/navigation';

const PILL = { width: 56, height: 32 } as const;
const ICON_SIZE = 22;
const LABEL_MAX_FONT_SCALE = 1.3;

/** El alto de la tab bar es fijo: con la fuente del sistema al máximo la etiqueta se pasaría del ancho de su tab. */
function TabLabel({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  return (
    <Paragraph
      fontSize={FONT_SIZE.sm}
      fontWeight={focused ? '700' : '500'}
      color={color}
      maxFontSizeMultiplier={LABEL_MAX_FONT_SCALE}
    >
      {label}
    </Paragraph>
  );
}

/**
 * El tab activo lleva el ícono relleno sobre una pill, como el ítem activo del navbar de web. Es una `View` con el
 * pill va aparte y cambia solo su opacidad: si cambiaba el fondo de la misma vista, Android dibujaba la pill cuadrada
 * después de cambiar de tab.
 */
function TabIcon({ icon: IconComponent, focused, color }: { icon: Icon; focused: boolean; color: string }) {
  const colors = useSemanticColors();

  return (
    <View style={styles.pillSlot}>
      <View style={[styles.pill, { backgroundColor: colors.primarySurface, opacity: focused ? 1 : 0 }]} />
      <IconComponent size={ICON_SIZE} color={color} weight={focused ? 'fill' : 'regular'} />
    </View>
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

const renderTabBar = (props: BottomTabBarProps) => <FloatingTabBar {...props} />;

const tabLabel = (key: NavKey) => NAV_REGISTRY[key].shortLabel ?? NAV_REGISTRY[key].label;

/** No dependen del tema (el color llega por props): se arman una vez y no en cada render del layout. */
const TAB_SCREENS = MOBILE_TAB_KEYS.map(key => ({
  name: TAB_ROUTES[key],
  options: tabOptions(tabLabel(key), NAV_ICONS[key]),
}));
const MORE_OPTIONS = tabOptions(MORE_TAB.label, MORE_TAB.icon);

export default function TabsLayout() {
  return (
    <Tabs tabBar={renderTabBar} screenOptions={{ headerShown: false }}>
      {TAB_SCREENS.map(({ name, options }) => (
        <Tabs.Screen key={name} name={name} options={options} />
      ))}
      <Tabs.Screen name={MORE_TAB.route} options={MORE_OPTIONS} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pillSlot: { width: PILL.width, height: PILL.height, alignItems: 'center', justifyContent: 'center' },
  pill: { ...StyleSheet.absoluteFillObject, borderRadius: PILL.height / 2 },
});
