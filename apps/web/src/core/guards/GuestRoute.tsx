import { FC } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Center } from '@mantine/core';

import { LoadingState } from '@/shared/ui';

import { useAuth } from '../auth';

export const GuestRoute: FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Center h="100vh">
        <LoadingState py="none" />
      </Center>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
