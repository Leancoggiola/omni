import { FC } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button, Center, Container, Stack } from '@mantine/core';

import { ApiError } from '@/shared/api';
import { ErrorState, LoadingState } from '@/shared/ui';

import { useAuth } from '../auth';

const SESSION_ERROR_MESSAGE = 'No pudimos verificar tu sesión. Intentá de nuevo.';

/** Solo un 401/403 prueba que no hay sesión; cualquier otro error (503, 429, red) significa que no se pudo verificar. */
const isSessionRejected = (error: unknown): boolean =>
  error instanceof ApiError && (error.status === 401 || error.status === 403);

export const ProtectedRoute: FC = () => {
  const { user, isLoading, error, retry, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Center h="100vh">
        <LoadingState py="none" />
      </Center>
    );
  }

  if (!user && error && !isSessionRejected(error)) {
    return (
      <Center h="100vh">
        <Container size="xs">
          <Stack>
            <ErrorState message={SESSION_ERROR_MESSAGE} onRetry={() => void retry()} />
            <Button variant="subtle" onClick={() => void logout()}>
              Cerrar sesión
            </Button>
          </Stack>
        </Container>
      </Center>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
};
