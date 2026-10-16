import { FC } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Center, Container, Loader } from '@mantine/core';

import { ApiError } from '@/shared/api';
import { ErrorState } from '@/shared/ui';

import { useAuth } from '../auth';

/** Solo un 401/403 prueba que no hay sesión; cualquier otro error (503, 429, red) significa que no se pudo verificar. */
const isSessionRejected = (error: unknown): boolean =>
  error instanceof ApiError && (error.status === 401 || error.status === 403);

export const ProtectedRoute: FC = () => {
  const { user, isLoading, error, retry } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  if (!user && error && !isSessionRejected(error)) {
    return (
      <Center h="100vh">
        <Container size="xs">
          <ErrorState message="No pudimos verificar tu sesión" onRetry={() => void retry()} />
        </Container>
      </Center>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
};
