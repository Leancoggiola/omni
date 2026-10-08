import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Button, Paragraph, useTheme } from 'tamagui';

import { useColorSchemeControl } from '@/core/theme';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Paragraph size="$1" fontWeight={focused ? '700' : '400'}>
      {label}
    </Paragraph>
  );
}

type TabIconName = 'home' | 'film' | 'person';

function TabIcon({ name, focused, color, size }: { name: TabIconName; focused: boolean; color: string; size: number }) {
  return <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color} />;
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
      icon={<Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={theme.color.val} />}
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
          tabBarIcon: props => <TabIcon name="home" {...props} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Inicio" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="media"
        options={{
          title: 'Media',
          tabBarIcon: props => <TabIcon name="film" {...props} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Media" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: props => <TabIcon name="person" {...props} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Perfil" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
