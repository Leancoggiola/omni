import { FC } from 'react';
import { Alert, Box, Button, Group, Modal, NumberInput, Select, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';

import { useGymCatalog } from '../../hooks/useGymCatalog';
import { useGymSubmit } from '../../hooks/useGymSubmit';
import { exerciseFormSchema, initialExerciseFormValues, toAddExercisePayload, toSets } from '../../utils/exerciseForm';
import { formatWeightKg } from '../../utils/gymFormat';
import { findMatchingVariant } from '../../utils/gymVariant';
import { GymFormBanner } from '../GymFormBanner';
import { CatalogResults } from './CatalogResults';

import type { ExerciseFormValues } from '../../utils/exerciseForm';
import type { GymSubmitResult } from '../../utils/gymSubmit';
import type { AddGymExercisePayload, GymWeekday } from '@omni/shared/gym';

import { EXERCISE_SETS_MAX } from '@omni/shared/common';
import { GYM_EXERCISE_NAME_MAX, GYM_REPS_MAX, GYM_WEEKDAY_LABELS, GYM_WEEKDAYS } from '@omni/shared/gym';
import { InfoIcon } from '@phosphor-icons/react';

const WEEKDAY_OPTIONS = GYM_WEEKDAYS.map(value => ({ value, label: GYM_WEEKDAY_LABELS[value] }));
const SOFT_REUSE_NOTICE = 'Si ya lo tenés con las mismas series y repeticiones, se reutiliza su peso y su historial.';

interface AddExerciseModalProps {
  opened: boolean;
  onClose: () => void;
  planId: string;
  weekday: GymWeekday;
  onSubmit: (payload: AddGymExercisePayload) => Promise<GymSubmitResult>;
}

interface AddExerciseFormProps {
  planId: string;
  weekday: GymWeekday;
  loading: boolean;
  conflict: string | null;
  onSubmit: (payload: AddGymExercisePayload) => Promise<void>;
  onCancel: () => void;
}

/**
 * Formulario de alta. Vive dentro del modal, así que se desmonta al cerrarlo y vuelve al estado inicial. Busca en el
 * catálogo mientras se escribe el nombre; si nombre, series y repeticiones coinciden con una variante avisa que se
 * reutiliza su peso e historial (y si la coincidencia no vino entre los resultados, lo avisa con un texto más suave).
 */
const AddExerciseForm: FC<AddExerciseFormProps> = ({ planId, weekday, loading, conflict, onSubmit, onCancel }) => {
  const form = useForm<ExerciseFormValues>({
    mode: 'controlled',
    initialValues: initialExerciseFormValues(weekday),
    validate: schemaResolver(exerciseFormSchema, { sync: true }),
  });

  const catalog = useGymCatalog(form.values.name);
  const match = findMatchingVariant(catalog.suggestions, {
    name: form.values.name,
    sets: toSets(form.values.sets),
    reps: form.values.reps,
  });

  const renderReuseNotice = () => {
    if (match) {
      return (
        <Alert color="success" icon={<InfoIcon size="1.25rem" />}>
          {match.currentWeightKg === null
            ? 'Ya la tenés en tu catálogo, sin peso cargado.'
            : `Ya la hiciste: se reutiliza su peso (${formatWeightKg(match.currentWeightKg)}) y su historial.`}
        </Alert>
      );
    }
    if (catalog.queried) {
      return (
        <Alert color="info" icon={<InfoIcon size="1.25rem" />}>
          {SOFT_REUSE_NOTICE}
        </Alert>
      );
    }
    return null;
  };

  return (
    <Box component="form" noValidate onSubmit={form.onSubmit(values => onSubmit(toAddExercisePayload(planId, values)))}>
      <Stack gap="md">
        {conflict && <GymFormBanner message={conflict} help="Elegí otro día o cambiá las series o las repeticiones." />}

        <Select
          label="Día"
          data={WEEKDAY_OPTIONS}
          allowDeselect={false}
          withAsterisk
          {...form.getInputProps('weekday')}
        />

        <TextInput
          label="Nombre"
          placeholder="Ej: Sentadilla"
          withAsterisk
          data-autofocus
          maxLength={GYM_EXERCISE_NAME_MAX}
          {...form.getInputProps('name')}
        />
        <CatalogResults
          query={form.values.name}
          queried={catalog.queried}
          searching={catalog.searching}
          failed={catalog.error !== undefined}
          suggestions={catalog.suggestions}
          matchedId={match?.id}
          onSelect={variant => form.setValues({ name: variant.name, sets: variant.sets ?? '', reps: variant.reps })}
          onRetry={() => void catalog.retry()}
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
          <TextInput
            label="Repeticiones"
            placeholder="Ej: 12, 8-12, AMRAP"
            withAsterisk
            maxLength={GYM_REPS_MAX}
            {...form.getInputProps('reps')}
          />
        </SimpleGrid>

        {renderReuseNotice()}

        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="outline" type="button" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Agregar ejercicio
          </Button>
        </Group>
      </Stack>
    </Box>
  );
};

/** Modal centrado para agregar un ejercicio a un día del plan (el día se crea si no existe). */
export const AddExerciseModal: FC<AddExerciseModalProps> = ({ opened, onClose, onSubmit, ...rest }) => {
  const { loading, conflict, submit, reset } = useGymSubmit<AddGymExercisePayload>(onSubmit);

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Agregar ejercicio"
      centered
      size="lg"
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      <AddExerciseForm {...rest} loading={loading} conflict={conflict} onSubmit={submit} onCancel={handleClose} />
    </Modal>
  );
};
