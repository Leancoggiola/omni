import { RouteObject } from 'react-router-dom';

export const mediaRoute: RouteObject = {
  path: '/media',
  lazy: async () => ({ Component: (await import('./media.page')).MediaPage }),
};
