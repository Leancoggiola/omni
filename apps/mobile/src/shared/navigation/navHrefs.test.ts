import { isNavAvailable, MOBILE_TAB_KEYS, NAV_KEYS, NAV_REGISTRY } from '@omni/shared/navigation';

import type { NavKey } from '@omni/shared/navigation';

import { NAV_HREFS } from './navHrefs';

describe('NAV_HREFS', () => {
  // Las tabs tienen ruta aunque el módulo no esté disponible (Alacena muestra un placeholder).
  const withRoute: NavKey[] = [
    ...new Set<NavKey>([...NAV_KEYS.filter(key => isNavAvailable(key, 'mobile')), ...MOBILE_TAB_KEYS]),
  ];

  it.each(withRoute)('%s tiene ruta en mobile', key => {
    expect(NAV_HREFS[key]).toBe(NAV_REGISTRY[key].path);
  });
});
