import { createBrowserRouter } from 'react-router-dom';

import { GuestRoute, ProtectedRoute } from '@/core/guards';
import { AuthLayout, RootLayout } from '@/layouts';
import { ErrorState, LoadingState } from '@/shared/ui';

import { guestRoutes, protectedRoutes } from './routes';

const routeErrorElement = (
  <ErrorState message="No se pudo cargar la pantalla" onRetry={() => window.location.reload()} />
);

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    hydrateFallbackElement: <LoadingState />,
    children: [
      {
        element: <RootLayout />,
        children: [{ errorElement: routeErrorElement, children: protectedRoutes }],
      },
    ],
  },
  {
    element: <GuestRoute />,
    hydrateFallbackElement: <LoadingState />,
    children: [
      {
        element: <AuthLayout />,
        children: [{ errorElement: routeErrorElement, children: guestRoutes }],
      },
    ],
  },
]);
