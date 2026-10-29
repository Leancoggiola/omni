import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import { RADIUS, SIZE, SPACING } from '@omni/shared/theme';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack } from 'tamagui';

import { useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { tabBarBottomOffset, useSetNotificationsBottomOffset } from '@/shared/ui';
import { glassElevation } from '@/theme/elevation';

const ICON_SIZE = 22;

/**
 * Tab bar flotante de v2: pill glass (`surface-glass`, `glass-border`, sombra `float`) de alto 72, a 16 de los bordes
 * y a 24 del inferior. Pinta el ícono y la etiqueta que cada tab declara en sus `options` (la pill activa va en el
 * ícono) y le pasa su alto, con la distancia al borde, a las notificaciones para apilarlas encima. Solo mientras las
 * tabs tienen el foco: Perfil se abre encima en el stack y las tabs siguen montadas, pero ahí no hay tab bar a la vista.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorSchemeControl();
  const colors = useSemanticColors();
  const setBottomOffset = useSetNotificationsBottomOffset();
  const isFocused = useIsFocused();
  const [height, setHeight] = useState(0);
  const bottom = tabBarBottomOffset(insets.bottom);

  useEffect(() => setBottomOffset(isFocused ? height + bottom : 0), [isFocused, height, bottom, setBottomOffset]);
  useEffect(() => () => setBottomOffset(0), [setBottomOffset]);

  return (
    <YStack
      testID="floating-tab-bar"
      position="absolute"
      left={SPACING.md}
      right={SPACING.md}
      bottom={bottom}
      onLayout={event => setHeight(event.nativeEvent.layout.height)}
    >
      <XStack
        height={SIZE.tabBar}
        borderRadius={RADIUS.full}
        borderWidth={1}
        borderColor="$glassBorder"
        backgroundColor="$surfaceGlass"
        alignItems="center"
        justifyContent="space-around"
        accessibilityRole="tablist"
        {...glassElevation('float', colorScheme)}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const color = focused ? colors.primary : colors.dimmed;
          const title = options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <YStack
              key={route.key}
              flex={1}
              height="100%"
              alignItems="center"
              justifyContent="center"
              gap={SPACING['3xs']}
              accessible
              accessibilityRole="tab"
              accessibilityLabel={title}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              onLongPress={onLongPress}
            >
              {options.tabBarIcon?.({ focused, color, size: ICON_SIZE })}
              {typeof options.tabBarLabel === 'function'
                ? options.tabBarLabel({ focused, color, position: 'below-icon', children: title })
                : null}
            </YStack>
          );
        })}
      </XStack>
    </YStack>
  );
}
