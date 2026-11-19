import { FC, useState } from 'react';
import { Box, Button, Group, Modal, Select, Stack, Text } from '@mantine/core';

import { useGymSubmit } from '../hooks/useGymSubmit';
import { GymFormBanner } from './GymFormBanner';

import type { GymSubmitResult } from '../utils/gymSubmit';
import type { GymPlanDay, GymWeekday } from '@omni/shared/gym';

import { GYM_WEEKDAY_LABELS, GYM_WEEKDAYS } from '@omni/shared/gym';

interface ChangeDayTarget {
  day: GymPlanDay;
  occupiedWeekdays: GymWeekday[];
}

interface ChangeDayModalProps {
  opened: boolean;
  target: ChangeDayTarget | null;
  onClose: () => void;
  onSubmit: (dayId: string, weekday: GymWeekday) => Promise<GymSubmitResult>;
}

interface ChangeDayFormProps {
  target: ChangeDayTarget;
  loading: boolean;
  conflict: string | null;
  onSubmit: (weekday: GymWeekday) => Promise<void>;
  onCancel: () => void;
}

const ChangeDayForm: FC<ChangeDayFormProps> = ({ target, loading, conflict, onSubmit, onCancel }) => {
  const current = target.day.weekday;
  const [weekday, setWeekday] = useState<GymWeekday>(current);
  const data = GYM_WEEKDAYS.map(value => {
    const occupied = target.occupiedWeekdays.includes(value);
    return {
      value,
      label: occupied ? `${GYM_WEEKDAY_LABELS[value]} · ya tiene ejercicios` : GYM_WEEKDAY_LABELS[value],
      disabled: occupied,
    };
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (weekday !== current) await onSubmit(weekday);
  };

  return (
    <Box component="form" noValidate onSubmit={event => void handleSubmit(event)}>
      <Stack gap="md">
        {conflict && <GymFormBanner message={conflict} help="Elegí un día libre: los días no se juntan." />}
        <Select
          label={`Pasar el ${GYM_WEEKDAY_LABELS[current].toLowerCase()} a`}
          withAsterisk
          data-autofocus
          allowDeselect={false}
          data={data}
          value={weekday}
          onChange={value => value && setWeekday(value as GymWeekday)}
        />
        <Text size="xs" c="dimmed">
          Los días que ya tienen ejercicios no se pueden elegir. Los ejercicios se mueven todos juntos.
        </Text>
        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="outline" type="button" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={weekday === current}>
            Cambiar de día
          </Button>
        </Group>
      </Stack>
    </Box>
  );
};

/** Pasar un día entero a otro día de la semana (todos sus ejercicios juntos); los días ocupados salen deshabilitados. */
export const ChangeDayModal: FC<ChangeDayModalProps> = ({ opened, target, onClose, onSubmit }) => {
  const { loading, conflict, submit, reset } = useGymSubmit<GymWeekday>(weekday =>
    target ? onSubmit(target.day.id, weekday) : Promise.resolve({ status: 'failed' })
  );

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const count = target?.day.exercises.length ?? 0;

  return (
    <Modal
      opened={opened && target !== null}
      onClose={handleClose}
      centered
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
      title={
        target && (
          <Stack gap="none">
            <Text inherit>Cambiar de día</Text>
            <Text size="sm" c="dimmed" ff="text" fw={400}>
              {`${GYM_WEEKDAY_LABELS[target.day.weekday]} · ${count === 1 ? '1 ejercicio' : `${count} ejercicios`}`}
            </Text>
          </Stack>
        )
      }
    >
      {target && (
        <ChangeDayForm target={target} loading={loading} conflict={conflict} onSubmit={submit} onCancel={handleClose} />
      )}
    </Modal>
  );
};
