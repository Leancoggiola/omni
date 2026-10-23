import { FC } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../auth';

/** Se anida dentro de `ProtectedRoute`: la sesión ya está resuelta, solo falta validar el rol. */
export const AdminRoute: FC = () => {
  const { user } = useAuth();

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
