import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extiende `app.json` con los valores de release inyectados por CI.
 * `APP_VARIANT=production` desactiva el tráfico HTTP sin cifrar.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const isProduction = process.env.APP_VARIANT === 'production';
  const versionCode = Number(process.env.APP_VERSION_CODE);

  const android = {
    ...config.android,
    versionCode: Number.isInteger(versionCode) && versionCode > 0 ? versionCode : 1,
    usesCleartextTraffic: !isProduction,
  };

  return {
    ...config,
    name: config.name ?? 'Omni',
    slug: config.slug ?? 'omni',
    version: process.env.APP_VERSION || config.version,
    android,
  };
};
