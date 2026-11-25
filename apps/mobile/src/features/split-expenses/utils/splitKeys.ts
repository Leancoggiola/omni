import { API_KEYS } from '@/shared/api';

/** Si una key de SWR es de División de gastos (juntadas, detalle, saldo propio o amigos). */
export function isSplitKey(key: unknown): key is string {
  if (typeof key !== 'string') return false;
  const { gatherings, balance, friends } = API_KEYS.splitExpenses;
  return key.startsWith(gatherings) || key === balance || key === friends;
}
