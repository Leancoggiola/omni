import { RouteObject } from 'react-router-dom';

export const splitExpensesRoute: RouteObject = {
  path: '/split-expenses',
  lazy: async () => ({ Component: (await import('./split-expenses.page')).SplitExpensesPage }),
};
