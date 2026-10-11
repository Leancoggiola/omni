import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extiende `app.json` con la versión de release inyectada por CI:
 * `APP_VERSION` (semver) y `APP_VERSION_CODE` (major·10000 + minor·100 + patch).
 * Sin variables conserva la versión de `app.json` y `versionCode` 1.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const versionCode = Number(process.env.APP_VERSION_CODE);

  return {
    ...config,
    name: config.name ?? 'Omni',
    slug: config.slug ?? 'omni',
    version: process.env.APP_VERSION || config.version,
    android: {
      ...config.android,
      versionCode: Number.isInteger(versionCode) && versionCode > 0 ? versionCode : 1,
    },
  };
};
