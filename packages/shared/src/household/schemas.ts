import { z } from 'zod';
import { HOUSEHOLD_INVITE_CODE_ALPHABET, HOUSEHOLD_INVITE_CODE_LENGTH } from './constants';

const INVITE_CODE_PATTERN = new RegExp(`^[${HOUSEHOLD_INVITE_CODE_ALPHABET}]{${HOUSEHOLD_INVITE_CODE_LENGTH}}$`);

/**
 * Normaliza lo que escribe la persona (minúsculas, espacios y guiones al copiar el código) antes de validar el
 * formato, así la API y los formularios comparten la misma regla.
 */
export function normalizeInviteCode(raw: string): string {
  return raw.replace(/[\s-]+/g, '').toUpperCase();
}

export const householdInviteCodeSchema = z.object({
  code: z
    .string()
    .max(64)
    .transform(normalizeInviteCode)
    .pipe(z.string().regex(INVITE_CODE_PATTERN, 'El código no es válido')),
});

export type HouseholdInviteCodePayload = z.infer<typeof householdInviteCodeSchema>;
