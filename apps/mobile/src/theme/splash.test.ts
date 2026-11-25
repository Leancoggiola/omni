import { BRAND, SEMANTIC } from '@omni/shared/theme';

import appJson from '../../app.json';

describe('splash de app.json', () => {
  const [, splash] = appJson.expo.plugins.find(
    plugin => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
  ) as [string, { backgroundColor: string; dark: { backgroundColor: string } }];

  it('usa la marca en claro y el fondo de la app en oscuro, así la app oscura no abre con una splash clara', () => {
    expect(splash.backgroundColor).toBe(BRAND[0]);
    expect(splash.dark.backgroundColor).toBe(SEMANTIC.dark.body);
  });
});
