import { GYM_WEEKDAY_LABELS, GYM_WEEKDAYS } from '@omni/shared/gym';
import { FONT_SIZE } from '@omni/shared/theme';
import { useCallback, useState } from 'react';
import { Paragraph } from 'tamagui';

import { Button, FormSheet, Select } from '@/shared/ui';

import { useGymSheetSubmit } from '../hooks/useGymSheetSubmit';
import { GymErrorBanner } from './GymErrorBanner';

import type { GymSubmitResult } from '../utils/gymSubmit';
import type { GymWeekday } from '@omni/shared/gym';

type ChangeDaySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekday: GymWeekday;
  exerciseCount: number;
  occupiedWeekdays: readonly GymWeekday[];
  onSubmit: (weekday: GymWeekday) => Promise<GymSubmitResult>;
  onClosed?: () => void;
};

type FormProps = Pick<ChangeDaySheetProps, 'weekday' | 'occupiedWeekdays'> & {
  submitting: boolean;
  onSubmit: (weekday: GymWeekday) => Promise<void>;
};

function ChangeDayForm({ weekday, occupiedWeekdays, submitting, onSubmit }: FormProps) {
  const [target, setTarget] = useState<GymWeekday>(weekday);
  const options = GYM_WEEKDAYS.map(value => {
    const occupied = occupiedWeekdays.includes(value);
    return {
      value,
      label: occupied ? `${GYM_WEEKDAY_LABELS[value]} · ya tiene ejercicios` : GYM_WEEKDAY_LABELS[value],
      disabled: occupied,
    };
  });

  return (
    <>
      <Select<GymWeekday>
        data={options}
        value={target}
        onChange={setTarget}
        accessibilityLabel={`Pasar el ${GYM_WEEKDAY_LABELS[weekday].toLowerCase()} a`}
      />
      <Paragraph color="dimmed" fontSize={FONT_SIZE.sm}>
        Los días que ya tienen ejercicios no se pueden elegir. Los ejercicios se mueven todos juntos.
      </Paragraph>
      <Button
        fullWidth
        size="lg"
        loading={submitting}
        disabled={target === weekday}
        onPress={() => void onSubmit(target)}
      >
        Cambiar de día
      </Button>
    </>
  );
}

/**
 * Hoja de pasar un día entero a otro día de la semana (todos sus ejercicios juntos). Los días ocupados salen
 * deshabilitados y un 409 ("El plan ya tiene ese día", si otro dispositivo lo ocupó) queda como aviso dentro de la
 * hoja.
 */
export function ChangeDaySheet({
  open,
  onOpenChange,
  weekday,
  exerciseCount,
  occupiedWeekdays,
  onSubmit,
  onClosed,
}: ChangeDaySheetProps) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { submitting, error, run } = useGymSheetSubmit<GymWeekday>(onSubmit, close);
  const count = exerciseCount === 1 ? '1 ejercicio' : `${exerciseCount} ejercicios`;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Cambiar de día · ${GYM_WEEKDAY_LABELS[weekday]} (${count})`}
      busy={submitting}
      onClosed={onClosed}
    >
      {error ? (
        <GymErrorBanner
          message={error.message}
          help={error.conflict ? 'Elegí un día libre: los días no se juntan.' : undefined}
        />
      ) : null}
      <ChangeDayForm weekday={weekday} occupiedWeekdays={occupiedWeekdays} submitting={submitting} onSubmit={run} />
    </FormSheet>
  );
}
