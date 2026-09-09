export const SWR_KEYS = {
  auth: {
    profile: '/api/auth/profile',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
  },
  users: {
    profile: '/api/users/profile',
    preferences: '/api/users/preferences',
    password: '/api/users/password',
    account: '/api/users/account',
  },
  media: {
    list: '/api/media/list',
    search: '/api/media/search',
    listItem: (id: string) => `/api/media/list/${id}`,
  },
  gym: {
    plans: '/api/gym/plans',
    plan: (id: string) => `/api/gym/plans/${id}`,
    planArchive: (id: string) => `/api/gym/plans/${id}/archive`,
    exercises: '/api/gym/exercises',
    exercise: (id: string) => `/api/gym/exercises/${id}`,
    exerciseWeight: (id: string) => `/api/gym/exercises/${id}/weight`,
  },
  pantry: {
    summary: '/api/pantry/summary',
    products: '/api/pantry/products',
    productsSuggest: '/api/pantry/products/suggest',
    product: (id: string) => `/api/pantry/products/${id}`,
    shoppingList: '/api/pantry/shopping-list',
    shoppingListGenerate: '/api/pantry/shopping-list/generate',
    shoppingListItems: '/api/pantry/shopping-list/items',
    shoppingListItem: (id: string) => `/api/pantry/shopping-list/items/${id}`,
    shoppingListItemComplete: (id: string) => `/api/pantry/shopping-list/items/${id}/complete`,
    shoppingListChecked: '/api/pantry/shopping-list/checked',
  },
  expenses: {
    summary: '/api/expenses/summary',
    list: '/api/expenses',
    expense: (id: string) => `/api/expenses/${id}`,
    reminders: '/api/expenses/reminders',
    reminder: (id: string) => `/api/expenses/reminders/${id}`,
    reminderComplete: (id: string) => `/api/expenses/reminders/${id}/complete`,
    reminderSnooze: (id: string) => `/api/expenses/reminders/${id}/snooze`,
  },
  splitExpenses: {
    friends: '/api/split-expenses/friends',
    friendsSuggest: '/api/split-expenses/friends/suggest',
    friend: (id: string) => `/api/split-expenses/friends/${id}`,
    gatherings: '/api/split-expenses/gatherings',
    gathering: (id: string) => `/api/split-expenses/gatherings/${id}`,
    gatheringSettled: (id: string) => `/api/split-expenses/gatherings/${id}/settled`,
    gatheringExpenses: (gatheringId: string) => `/api/split-expenses/gatherings/${gatheringId}/expenses`,
    gatheringExpense: (gatheringId: string, expenseId: string) =>
      `/api/split-expenses/gatherings/${gatheringId}/expenses/${expenseId}`,
  },
  notifications: {
    digest: '/api/notifications/digest',
    devices: '/api/notifications/devices',
    device: (id: string) => `/api/notifications/devices/${id}`,
  },
} as const;

export function buildQueryString(params: Record<string, string | number | undefined | null | boolean>): string {
  const search = new URLSearchParams();
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value != null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
