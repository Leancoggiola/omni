import { RouteObject } from 'react-router-dom';

import { AdminRoute } from '@/core/guards';

export const adminRoute: RouteObject = {
  element: <AdminRoute />,
  children: [
    {
      path: '/admin',
      lazy: async () => ({ Component: (await import('./admin.page')).AdminPage }),
    },
  ],
};
