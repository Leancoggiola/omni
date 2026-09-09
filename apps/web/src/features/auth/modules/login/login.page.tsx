import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, PasswordInput, Stack, TextInput } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';

import { useAuth } from '@/core/auth';

import { AuthCard } from './components/AuthCard';

import type { LoginPayload } from '@omni/shared/auth';
import type { FC } from 'react';

import { loginSchema } from '@omni/shared/auth';

export const LoginPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginPayload>({
    mode: 'uncontrolled',
    initialValues: {
      username: '',
      password: '',
    },
    validate: schemaResolver(loginSchema, { sync: true }),
  });

  const handleSubmit = async (values: LoginPayload) => {
    setLoading(true);
    setError(null);
    try {
      await login(values.username, values.password);
      const from = (location.state as { from?: string })?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="¡Te damos la bienvenida a Omni!">
      {error && (
        <Alert color="destructive" variant="light">
          {error}
        </Alert>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput label="Usuario" key={form.key('username')} {...form.getInputProps('username')} />
          <PasswordInput
            label="Contraseña"
            visibilityToggleFocusable
            key={form.key('password')}
            {...form.getInputProps('password')}
          />
          <Button size="lg" type="submit" loading={loading}>
            Ingresar
          </Button>
        </Stack>
      </form>
    </AuthCard>
  );
};
