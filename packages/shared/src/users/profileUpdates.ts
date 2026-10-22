import type { UpdateProfilePayload } from './schemas';
import type { UserProfile } from './types';

export interface ProfileUpdateValues {
  phone: string;
  birthDate?: string | null;
}

/** Texto opcional de un formulario: recortado, y vacío o con solo espacios = sin valor (`null`). */
export function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Día de calendario (YYYY-MM-DD) de una fecha de la API, o `null`. */
function isoDateKeyOf(value: string | null | undefined): string | null {
  return value?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}

/**
 * Campos de perfil que cambiaron; vacío si no hay cambios. `phone` se normaliza con `normalizeOptionalText`.
 * `birthDate` es el día elegido (YYYY-MM-DD) o `null` para borrarlo, se compara por día de calendario y viaja como
 * medianoche UTC; si no viene (`undefined`, el formulario no la edita) no se manda.
 */
export function buildProfileUpdates(
  profile: Pick<UserProfile, 'phone'> & Partial<Pick<UserProfile, 'birthDate'>>,
  values: ProfileUpdateValues
): UpdateProfilePayload {
  const updates: UpdateProfilePayload = {};
  const phone = normalizeOptionalText(values.phone);

  if (phone !== profile.phone) updates.phone = phone;

  if (values.birthDate !== undefined && values.birthDate !== isoDateKeyOf(profile.birthDate)) {
    updates.birthDate = values.birthDate ? `${values.birthDate}T00:00:00.000Z` : null;
  }

  return updates;
}
