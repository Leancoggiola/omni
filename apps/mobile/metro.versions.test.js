/** @jest-environment node */
const { createRequire } = require('node:module');

const pkg = require('./package.json');

/** El `metro` que usa Expo es el de `@expo/metro`, dependencia directa de `expo`: de ahí sale la versión de referencia. */
const expoMetro = createRequire(require.resolve('expo/package.json'))('@expo/metro/package.json');

describe('versiones de metro', () => {
  const declared = { ...pkg.dependencies, ...pkg.devDependencies };

  it.each(['metro', 'metro-resolver'])(
    '%s de apps/mobile coincide con el que declara @expo/metro del SDK (subirlo junto con expo, ver docs/mobile/tooling.md)',
    name => {
      expect(expoMetro.dependencies[name]).toBeDefined();
      expect(declared[name]).toBe(expoMetro.dependencies[name]);
    }
  );
});
