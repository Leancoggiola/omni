# Environment Setup

## `apps/api`

Copiar `.env.example` a `.env` y completar los valores:

```bash
cp apps/api/.env.example apps/api/.env
```

### Variables

| Variable                 | Requerida | Descripción                                                                                                                                                                                                                                     |
| ------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | Sí        | URL de Supabase con pgbouncer. Usada por la app en runtime.                                                                                                                                                                                     |
| `DIRECT_URL`             | Sí        | URL de Supabase por el **session pooler** (puerto `5432`). Usada por la CLI de Prisma (migraciones, seed) y por el entrypoint del Docker, que no arranca sin ella.                                                                              |
| `JWT_ACCESS_SECRET`      | Sí        | Secret para firmar access tokens. Generar con `openssl rand -base64 32`. En producción: al menos 32 caracteres y distinto de `JWT_REFRESH_SECRET`.                                                                                              |
| `JWT_REFRESH_SECRET`     | Sí        | Secret para firmar refresh tokens. Generar con `openssl rand -base64 32`. En producción: al menos 32 caracteres y distinto de `JWT_ACCESS_SECRET`.                                                                                              |
| `JWT_ACCESS_EXPIRES_IN`  | —         | Vigencia del access token y de su cookie. Entero positivo con unidad `s`, `m`, `h` o `d` (o segundos a secas), hasta `3650d`. Default: `15m`. Un valor inválido corta el arranque.                                                              |
| `JWT_REFRESH_EXPIRES_IN` | —         | Vigencia del refresh token, de su cookie y de su fila en la base. Mismo formato. Default: `7d`. Es la única fuente de ese TTL.                                                                                                                  |
| `PORT`                   | —         | Puerto del servidor. Default: `3000`.                                                                                                                                                                                                           |
| `CORS_ORIGIN`            | —         | Origen permitido (ej: `http://localhost:5173`). Si no se define, permite `localhost:5173`.                                                                                                                                                      |
| `TMDB_API_KEY`           | Sí        | **API Read Access Token** de TMDB (el JWT largo, no la API key v3): se manda como `Authorization: Bearer`. En producción el arranque rechaza una API key v3. Obtener en [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api). |
| `TMDB_BASE_URL`          | —         | Base de la API de TMDB. Default: `https://api.themoviedb.org/3`. La suite E2E la apunta a un stub local.                                                                                                                                        |
| `WIKIPEDIA_BASE_URL`     | —         | Base de la API REST de Wikipedia (efemérides). Default: `https://es.wikipedia.org/api/rest_v1`.                                                                                                                                                 |
| `WIKIPEDIA_USER_AGENT`   | —         | `User-Agent` con un contacto, como exige la política de Wikimedia. Default: `Omni/1.0 (https://github.com/Leancoggiola/omni)`.                                                                                                                  |
| `ADMIN_USERNAME`         | Sí        | Username del usuario admin inicial, de **6 a 20 letras o números** (el login lo exige). Usado por `prisma db seed`.                                                                                                                             |
| `ADMIN_PASSWORD`         | Sí        | Password del usuario admin inicial. Usado por `prisma db seed`.                                                                                                                                                                                 |
| `ORIGIN_SECRET`          | Prod      | Secret que Vercel envía como `x-origin-secret`. En producción la API no arranca sin él; en dev, vacío desactiva el guard.                                                                                                                       |
| `RATE_LIMIT_GLOBAL_MAX`  | —         | Máximo de requests por IP cada 15 min. Default: `300`.                                                                                                                                                                                          |
| `RATE_LIMIT_DISABLED`    | —         | `true` apaga los rate limits (la suite E2E sale desde una sola IP). Se ignora en producción.                                                                                                                                                    |
| `NODE_ENV`               | —         | `production` activa las validaciones estrictas de arranque (`ORIGIN_SECRET`, secretos JWT) y las cookies `secure`. El Docker ya lo define; `test` lo usan las suites.                                                                           |
| `RENDER_GIT_COMMIT`      | —         | Lo inyecta Render; `/api/health` lo devuelve para que el pipeline sepa que el deploy nuevo está vivo. No se define a mano.                                                                                                                      |

### Cómo obtener las URLs de Supabase

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto
2. **Project Settings → Database → Connection string**
3. `DATABASE_URL` → usar la de **Transaction pooler** (puerto `6543`) + agregar `?pgbouncer=true`
4. `DIRECT_URL` → usar la de **Session pooler** (puerto `5432`), la misma que usa producción. La conexión directa de Supabase es solo IPv6 y falla desde redes sin IPv6.

---

## `apps/web`

El frontend no tiene `.env`. En desarrollo Vite redirige `/api/*` a `localhost:3000` (`vite.config.ts`); en producción Vercel hace el proxy de `/api/*` a Render (`apps/web/vercel.json`) con `ORIGIN_SECRET`. No hay `VITE_API_URL`: la web siempre usa `/api` relativo.

## `apps/mobile`

Copiar `apps/mobile/.env.example` → `.env` y setear `EXPO_PUBLIC_API_URL` (sin slash final).

- **Dev:** la IP LAN de la PC (ej. `http://192.168.1.10:3000`).
- **Prod:** la inyecta CI (`PROD_WEB_URL`, `https://omni-nest.vercel.app`); no se define a mano.

Variables de build que lee `app.config.ts` (las setea CI en el release):

| Variable           | Descripción                                                               |
| ------------------ | ------------------------------------------------------------------------- |
| `APP_VERSION`      | `version` de la app (ej. `1.1.0`). Default: la de `app.json`.             |
| `APP_VERSION_CODE` | `android.versionCode`: major·10000 + minor·100 + patch (1.1.0 → `10100`). |
| `APP_VARIANT`      | `production` en el APK de release.                                        |

---

## Inicialización de la BD (primera vez)

```bash
cd apps/api

# 1. Aplicar migraciones
pnpm prisma migrate deploy

# 2. Crear usuario admin y datos de desarrollo
pnpm prisma db seed
```

Ver [prisma.md](../api/prisma.md) para más detalle sobre los comandos.
