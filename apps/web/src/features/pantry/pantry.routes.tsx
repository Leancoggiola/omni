import { RouteObject } from 'react-router-dom';

export const pantryRoute: RouteObject = {
  path: '/pantry',
  lazy: async () => ({ Component: (await import('./pantry.page')).PantryPage }),
};
