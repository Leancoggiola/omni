import { existsSync } from 'fs';
import { join } from 'path';

import { MORE_TAB, TAB_ROUTES } from './tabs';

jest.mock('phosphor-react-native', () => ({ SquaresFourIcon: () => null }));

const TABS_DIR = join(__dirname, '..', '..', '..', 'app', '(tabs)');

describe('rutas de las tabs', () => {
  it.each([...Object.values(TAB_ROUTES), MORE_TAB.route])('app/(tabs)/%s.tsx existe', route => {
    expect(existsSync(join(TABS_DIR, `${route}.tsx`))).toBe(true);
  });
});
