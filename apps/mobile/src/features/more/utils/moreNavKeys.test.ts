import { MAIN_NAV_ORDER, MOBILE_TAB_KEYS } from '@omni/shared/navigation';

import { MORE_NAV_KEYS } from './moreNavKeys';

import type { NavKey } from '@omni/shared/navigation';

const TAB_KEYS: readonly NavKey[] = MOBILE_TAB_KEYS;

describe('MORE_NAV_KEYS', () => {
  it('lista todos los módulos que no son tab, salvo Perfil', () => {
    const expected = MAIN_NAV_ORDER.filter(key => !TAB_KEYS.includes(key) && key !== 'profile');
    expect([...MORE_NAV_KEYS].sort()).toEqual([...expected].sort());
  });

  it('no repite tabs ni Perfil', () => {
    expect(MORE_NAV_KEYS.some(key => TAB_KEYS.includes(key) || key === 'profile')).toBe(false);
  });

  it('respeta el orden del navbar de web', () => {
    const positions = MORE_NAV_KEYS.map(key => MAIN_NAV_ORDER.indexOf(key as (typeof MAIN_NAV_ORDER)[number]));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
