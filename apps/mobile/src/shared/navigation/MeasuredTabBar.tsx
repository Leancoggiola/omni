import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useSetNotificationsBottomOffset } from '@/shared/ui';

/**
 * La tab bar de siempre, que además le pasa su alto (con el inset inferior) a las notificaciones para
 * apilarlas encima. Solo mientras las tabs tienen el foco: Perfil se abre encima en el stack y las tabs
 * siguen montadas, pero ahí no hay tab bar a la vista.
 *
 * Supone una tab bar abajo y dentro del flujo: con `tabBarStyle: { position: 'absolute' }` (flotante) o
 * `tabBarPosition` lateral, el contenedor mide 0 o un alto sin sentido.
 */
export function MeasuredTabBar(props: BottomTabBarProps) {
  const setBottomOffset = useSetNotificationsBottomOffset();
  const isFocused = useIsFocused();
  const [height, setHeight] = useState(0);

  useEffect(() => setBottomOffset(isFocused ? height : 0), [isFocused, height, setBottomOffset]);
  useEffect(() => () => setBottomOffset(0), [setBottomOffset]);

  return (
    <View testID="measured-tab-bar" onLayout={event => setHeight(event.nativeEvent.layout.height)}>
      <BottomTabBar {...props} />
    </View>
  );
}
