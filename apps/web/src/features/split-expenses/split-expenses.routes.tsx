import { RouteObject } from 'react-router-dom';

import { SplitExpensesPage } from './split-expenses.page';

export const splitExpensesRoute: RouteObject = {
  path: '/split-expenses',
  element: <SplitExpensesPage />,
};
