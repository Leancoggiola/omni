import { GYM_WEEKDAY_LABELS, GYM_WEEKDAYS } from '@omni/shared/gym';
import { FONT_SIZE } from '@omni/shared/theme';
import { useCallback, useState } from 'react';
import { Paragraph } from 'tamagui';

import { Button, FormSheet, Select } from '@/shared/ui';

import { useGymSheetSubmit } from '../hooks/useGymSheetSubmit';
import { GymErrorBanner } from './GymErrorBanner';

import type { GymSubmitResult } from '../utils/gymSubmit';
import type { GymWeekday } from '@omni/shared/gym';

type MoveExerciseSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  weekday: GymWeekday;
  occupiedWeekdays: readonly GymWeekday[];
  onSubmit: (weekday: GymWeekday) => Promise<GymSubmitResult>;
  onClosed?: () => void;
};

type FormProps = Pick<MoveExerciseSheetProps, 'weekday' | 'occupiedWeekdays'> & {
  submitting: boolean;
  onSubmit: (weekday: GymWeekday) => Promise<void>;
};

function MoveExerciseForm({ weekday, occupiedWeekdays, submitting, onSubmit }: FormProps) {
  const origin = GYM_WEEKDAY_LABELS[weekday].toLowerCase();
  const options = GYM_WEEKDAYS.filter(value => value !== weekday).map(value => {
    const occupied = occupiedWeekdays.includes(value);
    return {
      value,
      label: occupied ? `${GYM_WEEKDAY_LABELS[value]} · ya lo tiene` : GYM_WEEKDAY_LABELS[value],
      disabled: occupied,
    };
  });

  const firstFree = options.find(option => !option.disabled)?.value ?? null;
  const [target, setTarget] = useState<GymWeekday | null>(firstFree);

  return (
    <>
      <Select<GymWeekday>
        data={options}
        value={target ?? options[0]!.value}
        onChange={setTarget}
        accessibilityLabel="Mover a"
      />
      <Paragraph color="dimmed" fontSize={FONT_SIZE.sm}>
        {`Va al final del día elegido y solo cambia en este plan. Los días que ya tienen este ejercicio no se pueden elegir. Si el ${origin} se queda sin ejercicios, se borra.`}
      </Paragraph>
      <Button
        fullWidth
        size="lg"
        loading={submitting}
        disabled={target === null}
        onPress={() => target && void onSubmit(target)}
      >
        Mover ejercicio
      </Button>
    </>
  );
}

/**
 * Hoja de mover un ejercicio a otro día del plan (al final del día elegido). Los días donde la variante ya está salen
 * deshabilitados; un 409 queda como aviso dentro de la hoja. "Mover ejercicio" arranca en el primer día libre y queda
 * deshabilitado si todos están ocupados.
 */
export function MoveExerciseSheet({
  open,
  onOpenChange,
  exerciseName,
  weekday,
  occupiedWeekdays,
  onSubmit,
  onClosed,
}: MoveExerciseSheetProps) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { submitting, error, run } = useGymSheetSubmit<GymWeekday>(onSubmit, close);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Mover ${exerciseName}`}
      busy={submitting}
      onClosed={onClosed}
    >
      {error ? <GymErrorBanner message={error.message} help={error.conflict ? 'Elegí otro día.' : undefined} /> : null}
      <MoveExerciseForm weekday={weekday} occupiedWeekdays={occupiedWeekdays} submitting={submitting} onSubmit={run} />
    </FormSheet>
  );
}
