import { RouteObject } from 'react-router-dom';

export const loginRoute: RouteObject = {
  path: '/login',
  lazy: async () => ({ Component: (await import('./modules/login')).LoginPage }),
};
