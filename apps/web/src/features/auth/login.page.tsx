import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, PasswordInput, Stack, TextInput } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';

import { useAuth } from '@/core/auth';
import { ensureServerAwake } from '@/shared/api';
import { getErrorMessage } from '@/shared/ui';

import { AuthCard } from './components/AuthCard';

import type { LoginPayload } from '@omni/shared/auth';
import type { FC } from 'react';

import { loginSchema } from '@omni/shared/auth';

/**
 * Login. Al montar sondea el health (`ensureServerAwake`) para que la API despierte mientras el usuario escribe y
 * el aviso aparezca si tarda; el POST del login espera ese sondeo si sigue en curso. Los campos y el botón quedan
 * bloqueados mientras el login está en curso; si falla, el foco vuelve a la contraseña (el campo deshabilitado lo pierde).
 */
export const LoginPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void ensureServerAwake();
  }, []);

  useEffect(() => {
    if (error && !loading) passwordRef.current?.focus();
  }, [error, loading]);

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
      setError(getErrorMessage(err, 'Error al iniciar sesión'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="¡Te damos la bienvenida a Omni!" accent="Omni">
      {error && <Alert color="destructive">{error}</Alert>}

      <form noValidate onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Usuario"
            disabled={loading}
            key={form.key('username')}
            {...form.getInputProps('username')}
          />
          <PasswordInput
            ref={passwordRef}
            label="Contraseña"
            visibilityToggleFocusable
            disabled={loading}
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
