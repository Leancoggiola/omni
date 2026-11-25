import { describe, expect, it } from 'vitest';

import { API_PATHS, buildQueryString } from '..';

describe('API_PATHS', () => {
  it('arma los paths con id de media y admin', () => {
    expect(API_PATHS.media.listItem('abc')).toBe(`${API_PATHS.media.list}/abc`);
    expect(API_PATHS.admin.users).toBe('/api/admin/users');
    expect(API_PATHS.admin.user('u1')).toBe('/api/admin/users/u1');
  });

  it('expone el path de la foto de perfil bajo users', () => {
    expect(API_PATHS.users.avatar).toBe('/api/users/avatar');
  });

  it('arma los paths de split-expenses', () => {
    expect(API_PATHS.splitExpenses.friend('f1')).toBe('/api/split-expenses/friends/f1');
    expect(API_PATHS.splitExpenses.gathering('g1')).toBe('/api/split-expenses/gatherings/g1');
    expect(API_PATHS.splitExpenses.gatheringSettled('g1')).toBe('/api/split-expenses/gatherings/g1/settled');
    expect(API_PATHS.splitExpenses.gatheringExpenses('g1')).toBe('/api/split-expenses/gatherings/g1/expenses');
    expect(API_PATHS.splitExpenses.gatheringExpense('g1', 'e1')).toBe('/api/split-expenses/gatherings/g1/expenses/e1');
    expect(API_PATHS.splitExpenses.balance).toBe('/api/split-expenses/balance');
  });

  it('arma los paths de pantry', () => {
    expect(API_PATHS.pantry.product('p1')).toBe('/api/pantry/products/p1');
    expect(API_PATHS.pantry.shoppingListItem('i1')).toBe('/api/pantry/shopping-list/items/i1');
    expect(API_PATHS.pantry.shoppingListItemComplete('i1')).toBe('/api/pantry/shopping-list/items/i1/complete');
    expect(API_PATHS.pantry.shoppingListItemUncheck('i1')).toBe('/api/pantry/shopping-list/items/i1/uncheck');
  });

  it('arma los paths de gym', () => {
    expect(API_PATHS.gym.plans).toBe('/api/gym/plans');
    expect(API_PATHS.gym.plan('p1')).toBe('/api/gym/plans/p1');
    expect(API_PATHS.gym.planArchive('p1')).toBe('/api/gym/plans/p1/archive');
    expect(API_PATHS.gym.planUnarchive('p1')).toBe('/api/gym/plans/p1/unarchive');
    expect(API_PATHS.gym.day('d1')).toBe('/api/gym/days/d1');
    expect(API_PATHS.gym.dayExercisesOrder('d1')).toBe('/api/gym/days/d1/exercises/order');
    expect(API_PATHS.gym.exercises).toBe('/api/gym/exercises');
    expect(API_PATHS.gym.exercise('e1')).toBe('/api/gym/exercises/e1');
    expect(API_PATHS.gym.exerciseWeight('e1')).toBe('/api/gym/exercises/e1/weight');
    expect(API_PATHS.gym.exerciseWeightHistory('e1')).toBe('/api/gym/exercises/e1/weight-history');
    expect(API_PATHS.gym.catalog).toBe('/api/gym/exercises/catalog');
    expect(API_PATHS.gym.catalogWeightHistory('c1')).toBe('/api/gym/exercises/catalog/c1/weight-history');
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
