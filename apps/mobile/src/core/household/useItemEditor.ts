import { resolveItemEditor } from '@omni/shared/household';

import { useAuth } from '@/core/auth';

import { useHousehold } from './useHousehold';

import type { ItemAuthor } from '@omni/shared/household';

/**
 * Quién editó por última vez un ítem compartido, o `undefined` si no hay nada que sumar a "Agregado por"
 * (`resolveItemEditor`) o mientras el hogar o la sesión no cargaron.
 */
export function useItemEditor(createdById: string | null, updatedById: string | null): ItemAuthor | undefined {
  const { household } = useHousehold();
  const { user } = useAuth();

  return household && user ? resolveItemEditor(household.members, createdById, updatedById, user.username) : undefined;
}
