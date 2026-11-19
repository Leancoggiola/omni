import { EXERCISE_SETS_MAX } from '@omni/shared/common';
import { GYM_EXERCISE_NAME_MAX, GYM_REPS_MAX, GYM_WEEKDAY_LABELS, GYM_WEEKDAYS } from '@omni/shared/gym';
import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { InfoIcon } from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { Paragraph, XStack, YStack } from 'tamagui';

import { Banner, Button, FormSheet, Select, TextField } from '@/shared/ui';

import { useGymCatalogSuggestions } from '../hooks/useGymCatalogSuggestions';
import { useGymSheetSubmit } from '../hooks/useGymSheetSubmit';
import { findSameVariant, parseSetsInput } from '../utils/exerciseForm';
import { formatWeightKg } from '../utils/gymFormat';
import { CatalogResults } from './CatalogResults';
import { GymErrorBanner } from './GymErrorBanner';

import type { GymSubmitResult } from '../utils/gymSubmit';
import type { AddGymExercisePayload, GymCatalogExercise, GymWeekday } from '@omni/shared/gym';

const WEEKDAY_OPTIONS = GYM_WEEKDAYS.map(weekday => ({ value: weekday, label: GYM_WEEKDAY_LABELS[weekday] }));
const SOFT_REUSE_NOTICE = 'Si ya lo tenés con las mismas series y repeticiones, se reutiliza su peso y su historial.';
const SETS_MESSAGE = `Ingresá un número entero entre 1 y ${EXERCISE_SETS_MAX}`;

type NewExercise = Omit<AddGymExercisePayload, 'planId'>;

type AddExerciseSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialWeekday: GymWeekday;
  onAdd: (exercise: NewExercise) => Promise<GymSubmitResult>;
  onClosed?: () => void;
};

type FormProps = Pick<AddExerciseSheetProps, 'initialWeekday'> & {
  submitting: boolean;
  onSubmit: (exercise: NewExercise) => Promise<void>;
};

type Errors = Partial<Record<'name' | 'sets' | 'reps', string>>;

function AddExerciseForm({ initialWeekday, submitting, onSubmit }: FormProps) {
  const [weekday, setWeekday] = useState<GymWeekday>(initialWeekday);
  const [name, setName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const catalog = useGymCatalogSuggestions(name);

  const parsedSets = parseSetsInput(sets);
  const match =
    parsedSets === undefined || reps.trim() === ''
      ? undefined
      : findSameVariant(catalog.suggestions, { name, sets: parsedSets, reps });
  const dirty = name !== '' || sets !== '' || reps !== '' || weekday !== initialWeekday;

  const applySuggestion = (suggestion: GymCatalogExercise) => {
    setName(suggestion.name);
    setSets(suggestion.sets === null ? '' : String(suggestion.sets));
    setReps(suggestion.reps);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!dirty || submitting) return;
    const next: Errors = {
      ...(name.trim() === '' && { name: 'Ponele un nombre al ejercicio' }),
      ...(reps.trim() === '' && { reps: 'Ingresá las repeticiones' }),
      ...(parsedSets === undefined && { sets: SETS_MESSAGE }),
    };
    setErrors(next);
    if (Object.keys(next).length > 0 || parsedSets === undefined) return;
    await onSubmit({ weekday, name: name.trim(), sets: parsedSets, reps: reps.trim() });
  };

  const renderReuseNotice = () => {
    if (match) {
      return (
        <Banner color="success" icon={InfoIcon}>
          {match.currentWeightKg === null
            ? 'Ya la tenés en tu catálogo, sin peso cargado.'
            : `Ya la hiciste: se reutiliza su peso (${formatWeightKg(match.currentWeightKg)}) y su historial.`}
        </Banner>
      );
    }
    return catalog.queried ? (
      <Banner color="info" icon={InfoIcon}>
        {SOFT_REUSE_NOTICE}
      </Banner>
    ) : null;
  };

  return (
    <>
      <YStack gap={SPACING['2xs']}>
        <Paragraph fontSize={FONT_SIZE.md} fontWeight="600">
          Día
        </Paragraph>
        <Select<GymWeekday> data={WEEKDAY_OPTIONS} value={weekday} onChange={setWeekday} accessibilityLabel="Día" />
      </YStack>
      <TextField
        label="Nombre"
        required
        placeholder="Ej: Sentadilla"
        maxLength={GYM_EXERCISE_NAME_MAX}
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoCorrect={false}
      />
      <CatalogResults
        query={name}
        queried={catalog.queried}
        searching={catalog.searching}
        failed={catalog.error !== undefined}
        suggestions={catalog.suggestions}
        matchedId={match?.id}
        onSelect={applySuggestion}
        onRetry={() => void catalog.retry()}
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
            placeholder="Ej: 12"
            maxLength={GYM_REPS_MAX}
            value={reps}
            onChangeText={setReps}
            error={errors.reps}
            autoCorrect={false}
          />
        </YStack>
      </XStack>
      {renderReuseNotice()}
      <Button fullWidth size="lg" loading={submitting} disabled={!dirty} onPress={() => void handleSubmit()}>
        Agregar ejercicio
      </Button>
    </>
  );
}

/**
 * Hoja para agregar un ejercicio al plan que se está viendo, en el día que se pasa (el de hoy, o el del menú o la tira
 * desde donde se abrió). Busca en el catálogo mientras se escribe el nombre y avisa si nombre, series y repeticiones
 * coinciden con una variante (se reutiliza su peso e historial). Un 409 ("El ejercicio ya está en ese día") queda como
 * aviso dentro de la hoja. El padre la remonta con `key` en cada apertura.
 */
export function AddExerciseSheet({ open, onOpenChange, initialWeekday, onAdd, onClosed }: AddExerciseSheetProps) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { submitting, error, run } = useGymSheetSubmit<NewExercise>(onAdd, close);

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Agregar ejercicio" busy={submitting} onClosed={onClosed}>
      {error ? (
        <GymErrorBanner
          message={error.message}
          help={error.conflict ? 'Elegí otro día o cambiá las series o las repeticiones.' : undefined}
        />
      ) : null}
      <AddExerciseForm initialWeekday={initialWeekday} submitting={submitting} onSubmit={run} />
    </FormSheet>
  );
}
