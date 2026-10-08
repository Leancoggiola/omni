import { FC, useState } from 'react';
import { Alert, Button, Group, PasswordInput, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';

import { getErrorMessage } from '@/shared/ui';

import { createUserFormSchema, INITIAL_CREATE_USER_FORM_VALUES, toCreateUserPayload } from '../../utils/createUserForm';

import type { CreateUserFormValues } from '../../utils/createUserForm';
import type { CreateUserPayload } from '@omni/shared/auth';

interface CreateUserFormProps {
  loading: boolean;
  /** Throws on failure so the form can surface the message. */
  onCreate: (payload: CreateUserPayload) => Promise<void>;
  onCancel: () => void;
}

/** Rendered inside the modal, so Mantine unmounts it on close and the form state resets. */
export const CreateUserForm: FC<CreateUserFormProps> = ({ loading, onCreate, onCancel }) => {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CreateUserFormValues>({
    mode: 'controlled',
    initialValues: INITIAL_CREATE_USER_FORM_VALUES,
    validate: schemaResolver(createUserFormSchema, { sync: true }),
  });

  const handleSubmit = async (values: CreateUserFormValues) => {
    if (loading) return;

    setSubmitError(null);
    try {
      await onCreate(toCreateUserPayload(values));
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No se pudo crear el usuario'));
    }
  };

  // noValidate: los mensajes los da la validación del form, no el globo nativo del navegador.
  return (
    <form noValidate onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        {submitError && <Alert color="destructive">{submitError}</Alert>}

        <TextInput
          label="Usuario"
          description="6 a 20 letras o números. Es con lo que inicia sesión."
          placeholder="usuario01"
          required
          autoComplete="off"
          {...form.getInputProps('username')}
        />
        <TextInput label="Nombre" placeholder="Nombre y apellido" required {...form.getInputProps('name')} />
        <TextInput
          label="Email"
          description="Opcional."
          placeholder="usuario@email.com"
          inputMode="email"
          autoComplete="off"
          {...form.getInputProps('email')}
        />

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <PasswordInput
            label="Contraseña inicial"
            required
            autoComplete="new-password"
            visibilityToggleFocusable
            {...form.getInputProps('password')}
          />
          <PasswordInput
            label="Confirmar contraseña"
            required
            autoComplete="new-password"
            visibilityToggleFocusable
            {...form.getInputProps('confirmPassword')}
          />
        </SimpleGrid>

        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="outline" type="button" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={!form.isDirty()}>
            Crear usuario
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
