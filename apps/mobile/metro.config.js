const { getDefaultConfig } = require('expo/metro-config');
const { withTamagui } = require('@tamagui/metro-plugin');

const config = getDefaultConfig(__dirname);

/**
 * swr publica una build CommonJS y otra ESM, cada una con su propio contexto interno. Metro elige
 * una u otra según el import sea `import` o `require`, y si el bundle termina con las dos, el
 * `SWRConfig` (con el fetcher) de una no llega a los hooks de la otra: `swr/immutable` queda sin
 * fetcher y nunca dispara el request. Forzamos la build CommonJS para todo `swr` y `swr/*`.
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isSwr = moduleName === 'swr' || moduleName.startsWith('swr/');
  return context.resolveRequest(isSwr ? { ...context, isESMImport: false } : context, moduleName, platform);
};

config.resolver.useWatchman = !/[\\/]\.claude[\\/]worktrees[\\/]/.test(__dirname);

/**
 * `withTamagui` instala el compilador de Tamagui (reemplaza a `@tamagui/babel-plugin`) y lee sus opciones de
 * `tamagui.build.ts`. Va al final para componer con el `resolveRequest` de swr y con `useWatchman`. Se usa
 * `@tamagui/metro-plugin` y no `@tamagui/cli/metro` (mismos exports): `@tamagui/cli` fija `typescript@7` y pnpm lo
 * propaga como peer de `typescript-eslint`, que no lo soporta.
 */
module.exports = withTamagui(config);
