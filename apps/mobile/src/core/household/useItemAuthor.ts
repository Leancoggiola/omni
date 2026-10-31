import { resolveItemAuthor } from '@omni/shared/household';

import { useAuth } from '@/core/auth';

import { useHousehold } from './useHousehold';

import type { ItemAuthor } from '@omni/shared/household';

/** Autor de un ítem compartido, o `undefined` mientras el hogar no cargó o si ya no es integrante. */
export function useItemAuthor(createdById: string | null): ItemAuthor | undefined {
  const { household } = useHousehold();
  const { user } = useAuth();

  return household ? resolveItemAuthor(household.members, createdById, user?.username) : undefined;
}
