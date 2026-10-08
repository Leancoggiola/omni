import { RouteObject } from 'react-router-dom';

import { AdminRoute } from '@/core/guards';

import { AdminPage } from './admin.page';

export const adminRoute: RouteObject = {
  element: <AdminRoute />,
  children: [{ path: '/admin', element: <AdminPage /> }],
};
