import { RouteObject } from 'react-router-dom';

export const profileRoute: RouteObject = {
  path: '/profile',
  lazy: async () => ({ Component: (await import('./profile.page')).ProfilePage }),
};
