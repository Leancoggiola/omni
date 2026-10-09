import { ADMIN_NAV_ORDER, MAIN_NAV_ORDER, MOBILE_TAB_KEYS, NAV_KEYS } from '@omni/shared/navigation';

import type { NavKey } from '@omni/shared/navigation';

// `packages/shared` no tiene test runner: las invariantes del registro se prueban acá.
describe('registro de navegación', () => {
  const ordered: readonly NavKey[] = [...MAIN_NAV_ORDER, ...ADMIN_NAV_ORDER];

  it('MAIN_NAV_ORDER y ADMIN_NAV_ORDER cubren cada módulo una sola vez', () => {
    expect([...ordered].sort()).toEqual([...NAV_KEYS].sort());
  });

  it('las tabs de mobile son módulos del menú principal', () => {
    const main: readonly NavKey[] = MAIN_NAV_ORDER;
    expect(MOBILE_TAB_KEYS.every(key => main.includes(key))).toBe(true);
  });
});
