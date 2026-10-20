import { createBrowserRouter } from 'react-router-dom';

import { GuestRoute, ProtectedRoute } from '@/core/guards';
import { AuthLayout, RootLayout } from '@/layouts';
import { LoadingState } from '@/shared/ui';

import { guestRoutes, protectedRoutes } from './routes';

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    hydrateFallbackElement: <LoadingState />,
    children: [
      {
        element: <RootLayout />,
        children: protectedRoutes,
      },
    ],
  },
  {
    element: <GuestRoute />,
    hydrateFallbackElement: <LoadingState />,
    children: [
      {
        element: <AuthLayout />,
        children: guestRoutes,
      },
    ],
  },
]);
