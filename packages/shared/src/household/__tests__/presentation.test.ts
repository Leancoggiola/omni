import { describe, expect, it } from 'vitest';

import { ApiError } from '../../api/ApiError';
import {
  buildInviteMessage,
  DELETED_AUTHOR_LABEL,
  formatInviteCode,
  getInviteErrorMessage,
  INVALID_INVITE_MESSAGE,
  inviteHoursLeft,
  RATE_LIMITED_INVITE_MESSAGE,
  resolveItemAuthor,
} from '../presentation';

import type { HouseholdMemberInfo } from '../types';

const members: HouseholdMemberInfo[] = [
  { userId: 'u1', name: 'Leandro', username: 'leo', avatarUrl: null, joinedAt: '2026-03-12T00:00:00.000Z' },
  {
    userId: 'u2',
    name: 'Lucía',
    username: 'lucia',
    avatarUrl: 'https://cdn/lucia.png',
    joinedAt: '2026-03-12T00:00:00.000Z',
  },
];

describe('resolveItemAuthor', () => {
  it('marca como propio al integrante cuyo username es el de la sesión', () => {
    expect(resolveItemAuthor(members, 'u1', 'leo')).toEqual({ kind: 'self', name: 'Leandro', avatarUrl: null });
  });

  it('devuelve al otro integrante con su avatar', () => {
    expect(resolveItemAuthor(members, 'u2', 'leo')).toEqual({
      kind: 'member',
      name: 'Lucía',
      avatarUrl: 'https://cdn/lucia.png',
    });
  });

  it('un createdById nulo es una cuenta eliminada', () => {
    expect(resolveItemAuthor(members, null, 'leo')).toEqual({
      kind: 'deleted',
      name: DELETED_AUTHOR_LABEL,
      avatarUrl: null,
    });
  });

  it('un id que ya no es integrante no se muestra', () => {
    expect(resolveItemAuthor(members, 'u9', 'leo')).toBeUndefined();
  });
});

describe('invitación', () => {
  it('agrupa el código en dos mitades', () => {
    expect(formatInviteCode('K7M2QX4P')).toBe('K7M2 QX4P');
    expect(formatInviteCode('K7M2QX4P', '-')).toBe('K7M2-QX4P');
  });

  it('redondea las horas hacia arriba y no baja de 1 ni de 0 vencida', () => {
    const now = new Date('2026-10-31T10:00:00.000Z');
    expect(inviteHoursLeft('2026-11-02T10:00:00.000Z', now)).toBe(48);
    expect(inviteHoursLeft('2026-10-31T10:10:00.000Z', now)).toBe(1);
    expect(inviteHoursLeft('2026-10-31T09:00:00.000Z', now)).toBe(0);
  });

  it('arma el mensaje para compartir con el código y el vencimiento', () => {
    const now = new Date('2026-10-31T10:00:00.000Z');
    expect(buildInviteMessage('K7M2QX4P', '2026-11-02T10:00:00.000Z', now)).toBe(
      'Unite a mi hogar en Omni con este código: K7M2-QX4P. Vence en 48 h.'
    );
  });
});

describe('getInviteErrorMessage', () => {
  it('un 404 es el mensaje único de código inválido', () => {
    expect(getInviteErrorMessage(new ApiError('no existe', 404))).toBe(INVALID_INVITE_MESSAGE);
  });

  it('un 429 es el mensaje genérico de demasiados intentos', () => {
    expect(getInviteErrorMessage(new ApiError('Demasiados intentos', 429))).toBe(RATE_LIMITED_INVITE_MESSAGE);
  });

  it('un 409 conserva el texto de la API', () => {
    expect(getInviteErrorMessage(new ApiError('Ese hogar ya tiene el máximo de integrantes', 409))).toBe(
      'Ese hogar ya tiene el máximo de integrantes'
    );
  });

  it('un error de red usa el fallback', () => {
    expect(getInviteErrorMessage(new Error('Failed to fetch'))).toBe(
      'No pudimos revisar el código. Probá de nuevo en un momento.'
    );
  });
});
