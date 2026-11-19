import { EXERCISE_SETS_MAX } from '@omni/shared/common';
import { GYM_EXERCISE_NAME_MAX, GYM_REPS_MAX } from '@omni/shared/gym';
import { SPACING } from '@omni/shared/theme';
import { InfoIcon } from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { XStack, YStack } from 'tamagui';

import { Banner, Button, FormSheet, TextField } from '@/shared/ui';

import { useGymSheetSubmit } from '../hooks/useGymSheetSubmit';
import { parseSetsInput } from '../utils/exerciseForm';
import { formatWeightKg } from '../utils/gymFormat';
import { GymErrorBanner } from './GymErrorBanner';

import type { GymSubmitResult } from '../utils/gymSubmit';
import type { GymExercise, UpdateGymExercisePayload } from '@omni/shared/gym';

type EditExerciseSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: GymExercise;
  onSubmit: (payload: UpdateGymExercisePayload) => Promise<GymSubmitResult>;
  onClosed?: () => void;
};

type FormProps = Pick<EditExerciseSheetProps, 'exercise'> & {
  submitting: boolean;
  onSubmit: (payload: UpdateGymExercisePayload) => Promise<void>;
};

type Errors = Partial<Record<'name' | 'sets' | 'reps', string>>;

const SETS_MESSAGE = `Ingresá un número entero entre 1 y ${EXERCISE_SETS_MAX}`;

function EditExerciseForm({ exercise, submitting, onSubmit }: FormProps) {
  const [name, setName] = useState(exercise.name);
  const [sets, setSets] = useState(exercise.sets === null ? '' : String(exercise.sets));
  const [reps, setReps] = useState(exercise.reps);
  const [errors, setErrors] = useState<Errors>({});
  const dirty =
    name !== exercise.name || sets !== (exercise.sets === null ? '' : String(exercise.sets)) || reps !== exercise.reps;

  const handleSubmit = async () => {
    if (!dirty || submitting) return;
    const parsedSets = parseSetsInput(sets);
    const next: Errors = {
      ...(name.trim() === '' && { name: 'Ponele un nombre al ejercicio' }),
      ...(reps.trim() === '' && { reps: 'Ingresá las repeticiones' }),
      ...(parsedSets === undefined && { sets: SETS_MESSAGE }),
    };
    setErrors(next);
    if (Object.keys(next).length > 0 || parsedSets === undefined) return;
    await onSubmit({ name: name.trim(), sets: parsedSets, reps: reps.trim() });
  };

  return (
    <>
      <TextField
        label="Nombre"
        required
        maxLength={GYM_EXERCISE_NAME_MAX}
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoCorrect={false}
      />
      <XStack gap={SPACING.md} alignItems="flex-start">
        <YStack flex={1}>
          <TextField
            label="Series"
            placeholder="Opcional"
            keyboardType="number-pad"
            maxLength={4}
            value={sets}
            onChangeText={setSets}
            error={errors.sets}
          />
        </YStack>
        <YStack flex={1}>
          <TextField
            label="Repeticiones"
            required
            maxLength={GYM_REPS_MAX}
            value={reps}
            onChangeText={setReps}
            error={errors.reps}
            autoCorrect={false}
          />
        </YStack>
      </XStack>
      <Banner color="info" icon={InfoIcon}>
        {`Se cambia en todos tus planes que usan este ejercicio, también en los archivados.${
          exercise.currentWeightKg === null
            ? ''
            : `\nComo tiene ${formatWeightKg(exercise.currentWeightKg)} cargados, si cambiás las series o las repeticiones se suma un registro al historial.`
        }`}
      </Banner>
      <Button fullWidth size="lg" loading={submitting} disabled={!dirty} onPress={() => void handleSubmit()}>
        Guardar cambios
      </Button>
    </>
  );
}

/**
 * Hoja de editar un ejercicio: nombre, series y repeticiones de la variante (se ven en todos los planes que la usan).
 * Un 409 de variante repetida queda como aviso dentro de la hoja, que no se cierra. El padre la remonta con `key` en
 * cada apertura.
 */
export function EditExerciseSheet({ open, onOpenChange, exercise, onSubmit, onClosed }: EditExerciseSheetProps) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { submitting, error, run } = useGymSheetSubmit<UpdateGymExercisePayload>(onSubmit, close);

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Editar ejercicio" busy={submitting} onClosed={onClosed}>
      {error ? (
        <GymErrorBanner
          message={error.message}
          help={
            error.conflict
              ? 'Cambiá algún dato: los ejercicios no se fusionan. El que ya existe puede estar en otro plan, también archivado.'
              : undefined
          }
        />
      ) : null}
      <EditExerciseForm exercise={exercise} submitting={submitting} onSubmit={run} />
    </FormSheet>
  );
}
