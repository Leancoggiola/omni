import { RouteObject } from 'react-router-dom';

export const gymRoute: RouteObject = {
  path: '/gym',
  lazy: async () => ({ Component: (await import('./gym.page')).GymPage }),
};
