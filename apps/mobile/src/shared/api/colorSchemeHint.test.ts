import { store } from '@/test/secureStoreMock';

import { clearColorSchemeHint, readColorSchemeHint, saveColorSchemeHint } from './colorSchemeHint';

jest.mock('expo-secure-store', () => jest.requireActual('@/test/secureStoreMock'));

describe('colorSchemeHint', () => {
  beforeEach(() => store.clear());

  it('guarda, lee y borra el tema del perfil', async () => {
    await saveColorSchemeHint('dark');
    expect(await readColorSchemeHint()).toBe('dark');

    await clearColorSchemeHint();
    expect(await readColorSchemeHint()).toBeNull();
  });

  it('ignora un valor desconocido', async () => {
    store.set('omni.colorSchemeHint', 'sepia');
    expect(await readColorSchemeHint()).toBeNull();
  });
});
