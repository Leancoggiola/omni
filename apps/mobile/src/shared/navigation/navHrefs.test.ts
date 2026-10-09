import { isNavAvailable, NAV_KEYS, NAV_REGISTRY } from '@omni/shared/navigation';

import { NAV_HREFS } from './navHrefs';

describe('NAV_HREFS', () => {
  it.each(NAV_KEYS.filter(key => isNavAvailable(key, 'mobile')))('%s está disponible en mobile y tiene ruta', key => {
    expect(NAV_HREFS[key]).toBe(NAV_REGISTRY[key].path);
  });
});
