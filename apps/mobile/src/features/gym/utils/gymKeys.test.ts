import { unstable_serialize } from 'swr/infinite';
import { gymPlansKey } from '@omni/shared/gym';

import { GYM_PLANS_LIST_PAGE_SIZE, gymPlansPagesKey } from './gymKeys';

describe('gymPlansPagesKey', () => {
  it('es la key de la primera página de "Tus planes" de un estado, serializada para useSWRInfinite', () => {
    expect(gymPlansPagesKey('ACTIVE')).toBe(
      unstable_serialize(() => gymPlansKey('ACTIVE', 1, GYM_PLANS_LIST_PAGE_SIZE))
    );
    expect(gymPlansPagesKey('ACTIVE')).not.toBe(gymPlansPagesKey('ARCHIVED'));
  });
});
