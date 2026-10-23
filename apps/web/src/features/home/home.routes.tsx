import { RouteObject } from 'react-router-dom';

export const homeRoute: RouteObject = {
  index: true,
  lazy: async () => ({ Component: (await import('./home.page')).HomePage }),
};
