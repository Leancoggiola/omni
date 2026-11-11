export const API_PATHS = {
  health: '/api/health',
  auth: {
    profile: '/api/auth/profile',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    logoutAll: '/api/auth/logout-all',
  },
  users: {
    profile: '/api/users/profile',
    preferences: '/api/users/preferences',
    password: '/api/users/password',
    account: '/api/users/account',
    avatar: '/api/users/avatar',
  },
  admin: {
    users: '/api/admin/users',
    user: (id: string) => `/api/admin/users/${id}`,
  },
  media: {
    list: '/api/media/list',
    search: '/api/media/search',
    listItem: (id: string) => `/api/media/list/${id}`,
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
    balance: '/api/split-expenses/balance',
  },
  household: {
    current: '/api/household',
    invite: '/api/household/invite',
    invitePreview: '/api/household/invite/preview',
    inviteAccept: '/api/household/invite/accept',
    leave: '/api/household/leave',
  },
  pantry: {
    summary: '/api/pantry/summary',
    products: '/api/pantry/products',
    productsSuggest: '/api/pantry/products/suggest',
    productsScan: '/api/pantry/products/scan',
    product: (id: string) => `/api/pantry/products/${id}`,
    productStock: (id: string) => `/api/pantry/products/${id}/stock`,
    barcode: (barcode: string) => `/api/pantry/barcodes/${barcode}`,
    shoppingList: '/api/pantry/shopping-list',
    shoppingListGenerate: '/api/pantry/shopping-list/generate',
    shoppingListItems: '/api/pantry/shopping-list/items',
    shoppingListItem: (id: string) => `/api/pantry/shopping-list/items/${id}`,
    shoppingListItemComplete: (id: string) => `/api/pantry/shopping-list/items/${id}/complete`,
    shoppingListItemUncheck: (id: string) => `/api/pantry/shopping-list/items/${id}/uncheck`,
    shoppingListChecked: '/api/pantry/shopping-list/checked',
  },
  holidays: {
    today: '/api/holidays/today',
  },
  weather: {
    current: '/api/weather/current',
  },
} as const;

/**
 * Query string con las claves ordenadas (la misma key de caché sin importar el orden de los params). Omite `null`,
 * `undefined` y `''`; sin params devuelve `''`, y si no, el string con el `?` adelante.
 */
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
