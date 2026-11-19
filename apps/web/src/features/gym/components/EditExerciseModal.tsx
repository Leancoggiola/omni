import { FC } from 'react';
import { Alert, Box, Button, Group, Modal, NumberInput, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';

import { useGymSubmit } from '../hooks/useGymSubmit';
import { exerciseFieldsSchema, toEditExercisePayload } from '../utils/exerciseForm';
import { formatWeightKg } from '../utils/gymFormat';
import { GymFormBanner } from './GymFormBanner';

import type { ExerciseFieldsValues } from '../utils/exerciseForm';
import type { GymSubmitResult } from '../utils/gymSubmit';
import type { GymExercise, UpdateGymExercisePayload } from '@omni/shared/gym';

import { EXERCISE_SETS_MAX } from '@omni/shared/common';
import { GYM_EXERCISE_NAME_MAX, GYM_REPS_MAX } from '@omni/shared/gym';

interface EditExerciseModalProps {
  opened: boolean;
  exercise: GymExercise | null;
  onClose: () => void;
  onSubmit: (exerciseId: string, payload: UpdateGymExercisePayload) => Promise<GymSubmitResult>;
}

interface EditExerciseFormProps {
  exercise: GymExercise;
  loading: boolean;
  conflict: string | null;
  onSubmit: (values: ExerciseFieldsValues) => Promise<void>;
  onCancel: () => void;
}

const EditExerciseForm: FC<EditExerciseFormProps> = ({ exercise, loading, conflict, onSubmit, onCancel }) => {
  const form = useForm<ExerciseFieldsValues>({
    mode: 'controlled',
    initialValues: { name: exercise.name, sets: exercise.sets ?? '', reps: exercise.reps },
    validate: schemaResolver(exerciseFieldsSchema, { sync: true }),
  });

  return (
    <Box component="form" noValidate onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap="md">
        {conflict && (
          <GymFormBanner
            message={conflict}
            help="Cambiá algún dato: los ejercicios no se fusionan. El que ya existe puede estar en otro plan, también archivado."
          />
        )}
        <TextInput
          label="Nombre"
          withAsterisk
          data-autofocus
          maxLength={GYM_EXERCISE_NAME_MAX}
          {...form.getInputProps('name')}
        />
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <NumberInput
            label="Series"
            placeholder="Opcional"
            min={1}
            max={EXERCISE_SETS_MAX}
            allowNegative={false}
            allowDecimal={false}
            hideControls
            {...form.getInputProps('sets')}
          />
          <TextInput label="Repeticiones" withAsterisk maxLength={GYM_REPS_MAX} {...form.getInputProps('reps')} />
        </SimpleGrid>
        <Alert color="info">
          <Text size="sm">Se cambia en todos tus planes que usan este ejercicio, también en los archivados.</Text>
          {exercise.currentWeightKg !== null && (
            <Text size="sm">
              {`Como tiene ${formatWeightKg(exercise.currentWeightKg)} cargados, si cambiás las series o las repeticiones se suma un registro al historial.`}
            </Text>
          )}
        </Alert>
        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="outline" type="button" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={!form.isDirty()}>
            Guardar cambios
          </Button>
        </Group>
      </Stack>
    </Box>
  );
};

/** Editar un ejercicio: nombre, series y repeticiones de la variante (se ven en todos los planes que la usan). */
export const EditExerciseModal: FC<EditExerciseModalProps> = ({ opened, exercise, onClose, onSubmit }) => {
  const { loading, conflict, submit, reset } = useGymSubmit<ExerciseFieldsValues>(values =>
    exercise ? onSubmit(exercise.id, toEditExercisePayload(values)) : Promise.resolve({ status: 'failed' })
  );

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  return (
    <Modal
      opened={opened && exercise !== null}
      onClose={handleClose}
      title="Editar ejercicio"
      centered
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      {exercise && (
        <EditExerciseForm
          exercise={exercise}
          loading={loading}
          conflict={conflict}
          onSubmit={submit}
          onCancel={handleClose}
        />
      )}
    </Modal>
  );
};
