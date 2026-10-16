import { useEffect, useState } from 'react';
import { Alert, Button, Group, PasswordInput, SimpleGrid, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';

import { getErrorMessage, notifySuccess } from '@/shared/ui';

import type { ChangePasswordPayload } from '@omni/shared/users';
import type { FC } from 'react';

import { changePasswordSchema } from '@omni/shared/users';

interface PasswordFormValues extends ChangePasswordPayload {
  confirmPassword: string;
}

interface PasswordFormProps {
  onSubmit: (payload: ChangePasswordPayload) => Promise<void>;
}

const fieldError = (field: keyof ChangePasswordPayload, value: string): string | null => {
  const parsed = changePasswordSchema.shape[field].safeParse(value);
  return parsed.success ? null : (parsed.error.issues[0]?.message ?? 'Contraseña inválida');
};

export const PasswordForm: FC<PasswordFormProps> = ({ onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<PasswordFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      currentPassword: value => fieldError('currentPassword', value),
      newPassword: value => fieldError('newPassword', value),
      confirmPassword: (value, values) => (value !== values.newPassword ? 'Las contraseñas no coinciden' : null),
    },
  });

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const handleSubmit = async (values: PasswordFormValues) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await onSubmit({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      form.reset();
      setSuccessMessage('Contraseña actualizada correctamente');
      notifySuccess('Contraseña actualizada correctamente');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cambiar la contraseña'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form noValidate onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="sm">
        {error && <Alert color="destructive">{error}</Alert>}
        <PasswordInput
          label="Contraseña actual"
          autoComplete="current-password"
          visibilityToggleFocusable
          key={form.key('currentPassword')}
          {...form.getInputProps('currentPassword')}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <PasswordInput
            label="Nueva contraseña"
            autoComplete="new-password"
            visibilityToggleFocusable
            key={form.key('newPassword')}
            {...form.getInputProps('newPassword')}
          />
          <PasswordInput
            label="Confirmar contraseña"
            autoComplete="new-password"
            visibilityToggleFocusable
            key={form.key('confirmPassword')}
            {...form.getInputProps('confirmPassword')}
            success={successMessage ?? undefined}
          />
        </SimpleGrid>
        <Group justify="flex-end">
          <Button type="submit" loading={loading} disabled={!form.isDirty()}>
            Cambiar contraseña
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
