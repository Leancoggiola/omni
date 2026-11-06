import useSWR from 'swr';

import { SWR_KEYS } from '@/shared/api';

import type { SplitBalanceSummary } from '@omni/shared/split-expenses';

/** Lo que te deben y lo que debés en las juntadas activas (`GET /balance`); las juntadas sin "Vos" no cuentan. */
export function useSplitBalance() {
  const { data, error, isLoading, mutate } = useSWR<SplitBalanceSummary>(SWR_KEYS.splitExpenses.balance);
  return { balance: data ?? null, isLoading, error, mutate };
}
