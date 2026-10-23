import type { ConfigContext, ExpoConfig } from 'expo/config';

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const POSITIVE_INTEGER = /^[1-9]\d*$/;
const RELEASE_VERSION = /^\d+\.\d+\.\d+$/;

/**
 * Lee `APP_VERSION` y `APP_VERSION_CODE`. Con `APP_VARIANT=production` son obligatorias y válidas
 * (`X.Y.Z` sin prerelease ni build metadata, y entero > 0): un build de release mal configurado falla en vez de salir con `versionCode` 1.
 * Además `APP_VERSION_CODE` debe ser `major·10000 + minor·100 + patch` de `APP_VERSION`, con minor y patch menores a 100.
 * Fuera de production, una variable ausente o inválida cae a `undefined` / 1.
 */
function resolveRelease(env: NodeJS.ProcessEnv): { version: string | undefined; versionCode: number } {
  const isProduction = env.APP_VARIANT === 'production';
  const hasValidCode = POSITIVE_INTEGER.test(env.APP_VERSION_CODE ?? '');
  const versionCode = hasValidCode ? Number(env.APP_VERSION_CODE) : 1;
  const hasValidVersion = SEMVER.test(env.APP_VERSION ?? '');

  if (isProduction && !RELEASE_VERSION.test(env.APP_VERSION ?? '')) {
    throw new Error(
      `APP_VERSION debe ser X.Y.Z (sin prerelease ni build metadata) en APP_VARIANT=production (recibido: "${env.APP_VERSION ?? ''}")`
    );
  }
  if (isProduction && !hasValidCode) {
    throw new Error(
      `APP_VERSION_CODE debe ser un entero mayor a 0 en APP_VARIANT=production (recibido: "${env.APP_VERSION_CODE ?? ''}")`
    );
  }

  if (isProduction) {
    const [major = 0, minor = 0, patch = 0] = (env.APP_VERSION ?? '').split('.').map(Number);
    if (minor >= 100 || patch >= 100) {
      throw new Error(
        `APP_VERSION ${env.APP_VERSION}: minor y patch deben ser menores a 100 para que el versionCode sea monótono`
      );
    }
    const expected = major * 10000 + minor * 100 + patch;
    if (versionCode !== expected) {
      throw new Error(
        `APP_VERSION_CODE ${env.APP_VERSION_CODE} no coincide con APP_VERSION ${env.APP_VERSION} (esperado: ${expected} = major·10000 + minor·100 + patch)`
      );
    }
  }

  return { version: hasValidVersion ? env.APP_VERSION : undefined, versionCode };
}

/**
 * Extiende `app.json` con la versión de release inyectada por CI:
 * `APP_VERSION` (semver) y `APP_VERSION_CODE` (major·10000 + minor·100 + patch).
 * Sin variables conserva la versión de `app.json` y `versionCode` 1, salvo con `APP_VARIANT=production`, donde fallan.
 * `name` y `slug` los define `app.json`: el tipo de `config` los marca opcionales, por eso el cast.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const release = resolveRelease(process.env);

  return {
    ...(config as ExpoConfig),
    version: release.version ?? config.version,
    android: {
      ...config.android,
      versionCode: release.versionCode,
    },
  };
};
