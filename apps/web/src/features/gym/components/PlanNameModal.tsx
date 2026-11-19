import { FC } from 'react';
import { Box, Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';

import { planFormSchema } from '../utils/planForm';

import type { PlanFormValues } from '../utils/planForm';

import { GYM_PLAN_NAME_MAX } from '@omni/shared/gym';

interface PlanNameModalProps {
  opened: boolean;
  loading: boolean;
  onClose: () => void;
  initialName?: string;
  onSubmit: (name: string) => Promise<void>;
}

interface PlanNameFormProps {
  initialName?: string;
  loading: boolean;
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
}

const PlanNameForm: FC<PlanNameFormProps> = ({ initialName, loading, onSubmit, onCancel }) => {
  const form = useForm<PlanFormValues>({
    mode: 'controlled',
    initialValues: { name: initialName ?? '' },
    validate: schemaResolver(planFormSchema, { sync: true }),
  });
  const renaming = initialName !== undefined;

  const handleSubmit = async (values: PlanFormValues) => {
    if (loading) return;
    await onSubmit(values.name.trim());
  };

  return (
    <Box component="form" noValidate onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label="Nombre"
          description={`${form.values.name.length}/${GYM_PLAN_NAME_MAX}`}
          placeholder="Ej: Fuerza 3 días"
          withAsterisk
          data-autofocus
          maxLength={GYM_PLAN_NAME_MAX}
          {...form.getInputProps('name')}
        />
        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="outline" type="button" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={renaming && !form.isDirty()}>
            {renaming ? 'Guardar nombre' : 'Crear plan'}
          </Button>
        </Group>
      </Stack>
    </Box>
  );
};

/**
 * Modal con el nombre del plan, para crearlo ("Nuevo plan") o renombrarlo. `onSubmit` avisa los errores por su
 * cuenta (toast) y deja el modal abierto si lanza.
 */
export const PlanNameModal: FC<PlanNameModalProps> = ({ opened, loading, onClose, initialName, onSubmit }) => {
  const handleClose = () => {
    if (!loading) onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={initialName === undefined ? 'Nuevo plan' : 'Renombrar plan'}
      centered
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      <PlanNameForm initialName={initialName} loading={loading} onSubmit={onSubmit} onCancel={handleClose} />
    </Modal>
  );
};
