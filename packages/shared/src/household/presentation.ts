import { ApiError } from '../api/ApiError';
import { getErrorMessage } from '../api/errors';
import { HOUSEHOLD_INVITE_CODE_LENGTH } from './constants';

import type { HouseholdMemberInfo } from './types';

export type ItemAuthorKind = 'self' | 'member' | 'deleted';

export interface ItemAuthor {
  kind: ItemAuthorKind;
  name: string;
  avatarUrl: string | null;
}

export const DELETED_AUTHOR_LABEL = 'Cuenta eliminada';

export const INVALID_INVITE_MESSAGE = 'Este código no es válido o ya venció. Pedile a tu pareja uno nuevo.';

export const RATE_LIMITED_INVITE_MESSAGE = 'Probaste muchas veces seguidas. Esperá unos minutos y volvé a intentar.';

/**
 * Quién agregó un ítem compartido. `createdById` nulo es una cuenta eliminada (`SetNull` en la API); un id que ya no
 * es integrante (alguien que se desvinculó) devuelve `undefined`: no hay nada honesto que mostrar. `selfUsername` es el
 * de la sesión, que no trae el id.
 */
export function resolveItemAuthor(
  members: readonly HouseholdMemberInfo[],
  createdById: string | null,
  selfUsername: string | undefined
): ItemAuthor | undefined {
  if (createdById === null) return { kind: 'deleted', name: DELETED_AUTHOR_LABEL, avatarUrl: null };
  const member = members.find(candidate => candidate.userId === createdById);
  if (!member) return undefined;
  return {
    kind: member.username === selfUsername ? 'self' : 'member',
    name: member.name,
    avatarUrl: member.avatarUrl,
  };
}

/** Agrupa el código de 8 caracteres en dos mitades para leerlo y dictarlo (`K7M2 QX4P`). */
export function formatInviteCode(code: string, separator = ' '): string {
  const half = HOUSEHOLD_INVITE_CODE_LENGTH / 2;
  return `${code.slice(0, half)}${separator}${code.slice(half)}`;
}

/** Horas que le quedan a la invitación, redondeadas hacia arriba y nunca menos de 1 mientras no venció. */
export function inviteHoursLeft(expiresAt: string, now: Date): number {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.max(1, Math.ceil(ms / 3_600_000));
}

/** Fecha de vencimiento legible en español rioplatense (`lun, 2 nov, 14:30`). */
export function formatInviteExpiryDate(expiresAt: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(expiresAt));
}

/** Texto para pegar en el chat de la pareja. */
export function buildInviteMessage(code: string, expiresAt: string, now: Date): string {
  return `Unite a mi hogar en Omni con este código: ${formatInviteCode(code, '-')}. Vence en ${inviteHoursLeft(expiresAt, now)} h.`;
}

/**
 * Mensaje de un fallo al revisar o aceptar un código: el 404 es uno solo (inválido, vencido o usado) y el 429 es
 * genérico; los 409 (hogar lleno, propio hogar, ya vinculado) traen su texto en español desde la API.
 */
export function getInviteErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 404) return INVALID_INVITE_MESSAGE;
  if (err instanceof ApiError && err.status === 429) return RATE_LIMITED_INVITE_MESSAGE;
  return getErrorMessage(err, 'No pudimos revisar el código. Probá de nuevo en un momento.');
}
