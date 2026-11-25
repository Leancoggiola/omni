import { RADIUS, SPACING } from '@omni/shared/theme';
import { useIsFocused } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import { useColorSchemeControl } from '@/core/theme';
import { useKeyboardInset, useSetNotificationsBottomOffset } from '@/shared/ui';
import { themedElevation } from '@/theme/elevation';

import type { ReactNode } from 'react';

const GRABBER = { width: 40, height: 4 } as const;

/**
 * Panel fijo al pie de una juntada, con la forma de las hojas de v2. Va de borde a borde (descuenta el margen y el
 * inset de un `Screen` con `insetBottom`) y sube con el teclado, que en Android edge-to-edge no achica la ventana.
 * Mientras la pantalla tiene el foco les pasa su alto a las notificaciones, para que no lo tapen.
 */
export function BottomPanel({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorSchemeControl();
  const keyboardInset = useKeyboardInset();
  const isFocused = useIsFocused();
  const setBottomOffset = useSetNotificationsBottomOffset();
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!isFocused) return;
    setBottomOffset(height);
    return () => setBottomOffset(0);
  }, [isFocused, height, setBottomOffset]);

  return (
    <YStack
      testID="bottom-panel"
      onLayout={event => setHeight(event.nativeEvent.layout.height)}
      marginHorizontal={-SPACING.md}
      marginBottom={-insets.bottom}
      paddingTop={SPACING.sm}
      paddingHorizontal={SPACING.lg}
      paddingBottom={(keyboardInset > 0 ? keyboardInset : insets.bottom) + SPACING.md}
      gap={SPACING.sm}
      backgroundColor="backgroundStrong"
      borderTopLeftRadius={RADIUS['2xl']}
      borderTopRightRadius={RADIUS['2xl']}
      {...themedElevation('sheet', colorScheme)}
    >
      <YStack
        alignSelf="center"
        width={GRABBER.width}
        height={GRABBER.height}
        borderRadius={RADIUS.full}
        backgroundColor="track"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      {children}
    </YStack>
  );
}
