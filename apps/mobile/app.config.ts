import type { ConfigContext, ExpoConfig } from 'expo/config';

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * Lee `APP_VERSION` y `APP_VERSION_CODE`. Con `APP_VARIANT=production` son obligatorias y válidas
 * (semver y entero > 0): un build de release mal configurado falla en vez de salir con `versionCode` 1.
 * Fuera de production, una variable ausente o inválida cae a `undefined` / 1.
 */
function resolveRelease(env: NodeJS.ProcessEnv): { version: string | undefined; versionCode: number } {
  const isProduction = env.APP_VARIANT === 'production';
  const versionCode = Number(env.APP_VERSION_CODE);
  const hasValidCode = Number.isInteger(versionCode) && versionCode > 0;
  const hasValidVersion = SEMVER.test(env.APP_VERSION ?? '');

  if (isProduction && !hasValidVersion) {
    throw new Error(`APP_VERSION debe ser un semver en APP_VARIANT=production (recibido: "${env.APP_VERSION ?? ''}")`);
  }
  if (isProduction && !hasValidCode) {
    throw new Error(
      `APP_VERSION_CODE debe ser un entero mayor a 0 en APP_VARIANT=production (recibido: "${env.APP_VERSION_CODE ?? ''}")`
    );
  }

  return { version: env.APP_VERSION || undefined, versionCode: hasValidCode ? versionCode : 1 };
}

/**
 * Extiende `app.json` con la versión de release inyectada por CI:
 * `APP_VERSION` (semver) y `APP_VERSION_CODE` (major·10000 + minor·100 + patch).
 * Sin variables conserva la versión de `app.json` y `versionCode` 1, salvo con `APP_VARIANT=production`, donde fallan.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const release = resolveRelease(process.env);

  return {
    ...config,
    name: config.name ?? 'Omni',
    slug: config.slug ?? 'omni',
    version: release.version ?? config.version,
    android: {
      ...config.android,
      versionCode: release.versionCode,
    },
  };
};
