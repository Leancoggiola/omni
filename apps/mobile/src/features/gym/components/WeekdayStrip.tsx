import { GYM_WEEKDAY_LABELS, GYM_WEEKDAYS } from '@omni/shared/gym';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { XStack, YStack } from 'tamagui';
import { Paragraph } from '@/shared/ui';

import { formatExerciseCount, weekdayShortLabel } from '../utils/gymFormat';

import type { GymPlanDay, GymWeekday } from '@omni/shared/gym';

const DOT_SIZE = 6;
const ITEM_HEIGHT = 44;

type WeekdayStripProps = {
  days: readonly GymPlanDay[];
  readOnly: boolean;
  onGoToDay: (weekday: GymWeekday) => void;
  onAddToDay: (weekday: GymWeekday) => void;
};

/**
 * Tira de lunes a domingo. Los días con ejercicios van resaltados y con un punto, y tocarlos lleva hasta ese día de la
 * lista; tocar un día vacío abre "Agregar ejercicio" con ese día elegido (no en un plan archivado, donde no hace
 * nada).
 */
export function WeekdayStrip({ days, readOnly, onGoToDay, onAddToDay }: WeekdayStripProps) {
  const counts = new Map(days.map(day => [day.weekday, day.exercises.length]));

  return (
    <XStack justifyContent="space-between" accessibilityLabel="Días del plan">
      {GYM_WEEKDAYS.map(weekday => {
        const count = counts.get(weekday) ?? 0;
        const active = count > 0;
        const pressable = active || !readOnly;
        const label = GYM_WEEKDAY_LABELS[weekday];
        return (
          <YStack
            key={weekday}
            flex={1}
            height={ITEM_HEIGHT}
            alignItems="center"
            justifyContent="center"
            gap={SPACING['2xs']}
            borderRadius={RADIUS.md}
            disabled={!pressable}
            onPress={pressable ? () => (active ? onGoToDay(weekday) : onAddToDay(weekday)) : undefined}
            opacity={pressable ? 'press:0.7' : undefined}
            accessible
            accessibilityRole="button"
            accessibilityLabel={
              active
                ? `${label}, ${formatExerciseCount(count)}`
                : `${label}, sin ejercicios${readOnly ? '' : ', agregar'}`
            }
            accessibilityState={{ disabled: !pressable }}
          >
            <Paragraph fontSize={FONT_SIZE.md} fontWeight={active ? '700' : '500'} color={active ? 'color' : 'dimmed'}>
              {weekdayShortLabel(weekday)}
            </Paragraph>
            <YStack
              width={DOT_SIZE}
              height={DOT_SIZE}
              borderRadius={RADIUS.full}
              backgroundColor={active ? 'primary' : 'transparent'}
            />
          </YStack>
        );
      })}
    </XStack>
  );
}
