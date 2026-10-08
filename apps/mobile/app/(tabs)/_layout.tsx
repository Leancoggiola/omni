import { Tabs } from 'expo-router';
import { FilmSlateIcon, HouseIcon, MoonIcon, SunIcon, UserIcon, type Icon } from 'phosphor-react-native';
import { Button, Paragraph, useTheme } from 'tamagui';

import { useColorSchemeControl } from '@/core/theme';

function TabLabel({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  return (
    <Paragraph size="$1" fontWeight={focused ? '700' : '400'} color={color}>
      {label}
    </Paragraph>
  );
}

/** Mismos íconos Phosphor que el nav de web; en mobile el tab activo usa `weight="fill"`. */
function TabIcon({
  icon: IconComponent,
  focused,
  color,
  size,
}: {
  icon: Icon;
  focused: boolean;
  color: string;
  size: number;
}) {
  return <IconComponent size={size} color={color} weight={focused ? 'fill' : 'regular'} />;
}

function ColorSchemeToggle() {
  const { colorScheme, toggle } = useColorSchemeControl();
  const theme = useTheme();
  const isDark = colorScheme === 'dark';

  return (
    <Button
      chromeless
      circular
      size="$3"
      marginRight="$2"
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      icon={isDark ? <SunIcon size={20} color={theme.color.val} /> : <MoonIcon size={20} color={theme.color.val} />}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true, headerRight: () => <ColorSchemeToggle /> }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: props => <TabIcon icon={HouseIcon} {...props} />,
          tabBarLabel: ({ focused, color }) => <TabLabel label="Inicio" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="media"
        options={{
          title: 'Media',
          tabBarIcon: props => <TabIcon icon={FilmSlateIcon} {...props} />,
          tabBarLabel: ({ focused, color }) => <TabLabel label="Media" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: props => <TabIcon icon={UserIcon} {...props} />,
          tabBarLabel: ({ focused, color }) => <TabLabel label="Perfil" focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}
