import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { CheckIcon } from 'phosphor-react-native';
import { type PropsWithChildren } from 'react';
import { useWindowDimensions } from 'react-native';
import { Paragraph, Sheet, XStack, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

import { Button } from '../button/Button';
import { QueuedSheet } from '../sheet/QueuedSheet';
import { useSheetQueue } from '../sheet/useSheetQueue';
import { Title } from '../Title';

import { registerActionSheetHandler, type ActionSheetRequest } from './actionSheet';

const OPTION_HEIGHT = 48;
/**
 * Con muchas opciones la lista scrollea dentro de este alto: título y "Cancelar" siempre quedan a la vista.
 * `Sheet.ScrollView` coordina el scroll con el arrastre del sheet.
 */
const MAX_LIST_RATIO = 0.5;

/** Opciones de `actionSheet()` en un bottom sheet: una por fila, check en la actual y "Cancelar" abajo. */
export function ActionSheetProvider({ children }: PropsWithChildren) {
  const colors = useSemanticColors();
  const { height } = useWindowDimensions();
  const queue = useSheetQueue<string | null, ActionSheetRequest>(registerActionSheetHandler, null);
  const request = queue.shown;

  return (
    <>
      {children}
      <QueuedSheet queue={queue}>
        <YStack gap={SPACING.xs}>
          <Title order={3}>{request?.title}</Title>
          {request?.description ? (
            <Paragraph fontSize={FONT_SIZE.md} color="$dimmed">
              {request.description}
            </Paragraph>
          ) : null}
        </YStack>
        <Sheet.ScrollView maxHeight={height * MAX_LIST_RATIO} bounces={false}>
          <YStack gap={SPACING['2xs']} accessibilityRole="menu">
            {request?.options.map(option => {
              const selected = option.value === request.value;
              const OptionIcon = option.icon;
              return (
                <XStack
                  key={option.value}
                  height={OPTION_HEIGHT}
                  paddingHorizontal={SPACING.sm}
                  gap={SPACING.sm}
                  alignItems="center"
                  borderRadius={RADIUS.lg}
                  backgroundColor={selected ? '$primarySurface' : 'transparent'}
                  pressStyle={{ backgroundColor: '$hover' }}
                  onPress={() => queue.close(option.value)}
                  accessible
                  accessibilityRole="menuitem"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected }}
                >
                  {OptionIcon ? <OptionIcon size={20} color={selected ? colors.primary : colors.text} /> : null}
                  <Paragraph
                    flex={1}
                    fontSize={FONT_SIZE.lg}
                    fontWeight={selected ? '600' : '400'}
                    color={selected ? '$primary' : '$color'}
                  >
                    {option.label}
                  </Paragraph>
                  {selected ? <CheckIcon size={20} color={colors.primary} weight="bold" /> : null}
                </XStack>
              );
            })}
          </YStack>
        </Sheet.ScrollView>
        <Button fullWidth variant="outline" onPress={() => queue.close(null)}>
          {request?.cancelLabel ?? ''}
        </Button>
      </QueuedSheet>
    </>
  );
}
