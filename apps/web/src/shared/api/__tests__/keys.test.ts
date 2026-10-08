import { describe, expect, it } from 'vitest';

import { buildQueryString, SWR_KEYS } from '../keys';

describe('SWR_KEYS', () => {
  it('exposes media listItem helper', () => {
    const id = 'abc';
    expect(SWR_KEYS.media.listItem(id)).toBe(`${SWR_KEYS.media.list}/${id}`);
  });

  it('exposes admin users path helpers', () => {
    expect(SWR_KEYS.admin.users).toBe('/api/admin/users');
    expect(SWR_KEYS.admin.user('u1')).toBe('/api/admin/users/u1');
  });

  it('exposes lifestyle path helpers', () => {
    expect(SWR_KEYS.gym.plan('p1')).toBe('/api/gym/plans/p1');
    expect(SWR_KEYS.gym.planArchive('p1')).toBe('/api/gym/plans/p1/archive');
    expect(SWR_KEYS.gym.exercise('ex1')).toBe('/api/gym/exercises/ex1');
    expect(SWR_KEYS.gym.exerciseWeight('ex1')).toBe('/api/gym/exercises/ex1/weight');

    expect(SWR_KEYS.pantry.product('prod1')).toBe('/api/pantry/products/prod1');
    expect(SWR_KEYS.pantry.shoppingListItem('item1')).toBe('/api/pantry/shopping-list/items/item1');
    expect(SWR_KEYS.pantry.shoppingListItemComplete('item1')).toBe('/api/pantry/shopping-list/items/item1/complete');

    expect(SWR_KEYS.expenses.expense('e1')).toBe('/api/expenses/e1');
    expect(SWR_KEYS.expenses.reminder('r1')).toBe('/api/expenses/reminders/r1');
    expect(SWR_KEYS.expenses.reminderComplete('r1')).toBe('/api/expenses/reminders/r1/complete');
    expect(SWR_KEYS.expenses.reminderSnooze('r1')).toBe('/api/expenses/reminders/r1/snooze');

    expect(SWR_KEYS.splitExpenses.friend('f1')).toBe('/api/split-expenses/friends/f1');
    expect(SWR_KEYS.splitExpenses.gathering('g1')).toBe('/api/split-expenses/gatherings/g1');
    expect(SWR_KEYS.splitExpenses.gatheringSettled('g1')).toBe('/api/split-expenses/gatherings/g1/settled');
    expect(SWR_KEYS.splitExpenses.gatheringExpenses('g1')).toBe('/api/split-expenses/gatherings/g1/expenses');
    expect(SWR_KEYS.splitExpenses.gatheringExpense('g1', 'e1')).toBe('/api/split-expenses/gatherings/g1/expenses/e1');

    expect(SWR_KEYS.notifications.device('d1')).toBe('/api/notifications/devices/d1');
  });
});

describe('buildQueryString', () => {
  it('returns empty string when no params', () => {
    expect(buildQueryString({})).toBe('');
  });

  it('sorts keys alphabetically', () => {
    expect(buildQueryString({ z: '1', a: '2', m: '3' })).toBe('?a=2&m=3&z=1');
  });

  it('skips null, undefined and empty string', () => {
    expect(buildQueryString({ a: null, b: undefined, c: '', d: 'ok' })).toBe('?d=ok');
  });

  it('stringifies numbers', () => {
    expect(buildQueryString({ page: 2 })).toBe('?page=2');
  });
});
