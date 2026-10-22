import { describe, expect, it } from 'vitest';

import { API_PATHS, buildQueryString } from '..';

describe('API_PATHS', () => {
  it('arma los paths con id de media y admin', () => {
    expect(API_PATHS.media.listItem('abc')).toBe(`${API_PATHS.media.list}/abc`);
    expect(API_PATHS.admin.users).toBe('/api/admin/users');
    expect(API_PATHS.admin.user('u1')).toBe('/api/admin/users/u1');
  });

  it('arma los paths de split-expenses', () => {
    expect(API_PATHS.splitExpenses.friend('f1')).toBe('/api/split-expenses/friends/f1');
    expect(API_PATHS.splitExpenses.gathering('g1')).toBe('/api/split-expenses/gatherings/g1');
    expect(API_PATHS.splitExpenses.gatheringSettled('g1')).toBe('/api/split-expenses/gatherings/g1/settled');
    expect(API_PATHS.splitExpenses.gatheringExpenses('g1')).toBe('/api/split-expenses/gatherings/g1/expenses');
    expect(API_PATHS.splitExpenses.gatheringExpense('g1', 'e1')).toBe('/api/split-expenses/gatherings/g1/expenses/e1');
  });
});

describe('buildQueryString', () => {
  it('sin params devuelve un string vacío', () => {
    expect(buildQueryString({})).toBe('');
  });

  it('ordena las claves', () => {
    expect(buildQueryString({ z: '1', a: '2', m: '3' })).toBe('?a=2&m=3&z=1');
  });

  it('omite null, undefined y el string vacío, y convierte números y booleanos', () => {
    expect(buildQueryString({ a: null, b: undefined, c: '', d: 'ok', page: 2, all: false })).toBe(
      '?all=false&d=ok&page=2'
    );
  });
});
