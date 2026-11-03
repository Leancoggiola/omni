import { useAuth } from '@/core/auth';

import { useHousehold } from './useHousehold';

import type { ItemAuthor } from '@omni/shared/household';

import { resolveItemAuthor } from '@omni/shared/household';

/**
 * Autor de un ítem compartido, o `undefined` mientras el hogar o la sesión no cargaron (sin sesión no se distingue
 * "Vos" de la pareja) o si ya no es integrante.
 */
export function useItemAuthor(createdById: string | null): ItemAuthor | undefined {
  const { household } = useHousehold();
  const { user } = useAuth();

  return household && user ? resolveItemAuthor(household.members, createdById, user.username) : undefined;
}
