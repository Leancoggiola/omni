import { RADIUS, SPACING } from '@omni/shared/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sheet, YStack } from 'tamagui';

import { useColorSchemeControl } from '@/core/theme';
import { themedElevation } from '@/theme/elevation';

import type { ComponentProps, ReactNode } from 'react';

const GRABBER = { width: 40, height: 4 } as const;

type SheetFrameProps = Omit<ComponentProps<typeof Sheet.Frame>, 'children'> & {
  children: ReactNode;
};

/**
 * Marco de las hojas inferiores de v2: superficie sólida de radio 32 arriba, sombra `sheet`, grabber de 40 x 4 en
 * `track` y el padding del DS (12 arriba, 20 a los lados, 24 abajo más el inset del sistema). Es lo que usan
 * `confirm()`, `actionSheet()` y los formularios en hoja.
 */
export function SheetFrame({ children, gap = SPACING.md, ...props }: SheetFrameProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorSchemeControl();

  return (
    <Sheet.Frame
      backgroundColor="$backgroundStrong"
      borderTopLeftRadius={RADIUS['2xl']}
      borderTopRightRadius={RADIUS['2xl']}
      paddingTop={SPACING.sm}
      paddingHorizontal={SPACING.lg}
      paddingBottom={SPACING.xl + insets.bottom}
      gap={gap}
      {...themedElevation('sheet', colorScheme)}
      {...props}
    >
      <YStack
        alignSelf="center"
        width={GRABBER.width}
        height={GRABBER.height}
        borderRadius={RADIUS.full}
        backgroundColor="$track"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      {children}
    </Sheet.Frame>
  );
}
