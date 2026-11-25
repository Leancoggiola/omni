import useSWR from 'swr';

import { API_KEYS } from '@/shared/api';

import type { SplitBalanceSummary } from '@omni/shared/split-expenses';

/** Lo que te deben y lo que debés en las juntadas activas; las juntadas sin "Vos" no cuentan. */
export function useSplitBalance() {
  const { data, error, isLoading, mutate } = useSWR<SplitBalanceSummary>(API_KEYS.splitExpenses.balance);
  return { balance: data, isLoading, error, mutate };
}
