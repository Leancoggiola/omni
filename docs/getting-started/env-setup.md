# Environment Setup

## `apps/api`

Copiar `.env.example` a `.env` y completar los valores:

```bash
cp apps/api/.env.example apps/api/.env
```

### Variables

| Variable                 | Requerida | Descripción                                                                                                               |
| ------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | Sí        | URL de Supabase con pgbouncer. Usada por la app en runtime.                                                               |
| `DIRECT_URL`             | Sí        | URL de Supabase sin pooler. Usada por la CLI de Prisma (migraciones, seed).                                               |
| `JWT_ACCESS_SECRET`      | Sí        | Secret para firmar access tokens. Generar con `openssl rand -base64 32`.                                                  |
| `JWT_REFRESH_SECRET`     | Sí        | Secret para firmar refresh tokens. Generar con `openssl rand -base64 32`.                                                 |
| `JWT_ACCESS_EXPIRES_IN`  | —         | Expiración del access token. Default: `15m`.                                                                              |
| `JWT_REFRESH_EXPIRES_IN` | —         | Expiración del refresh token. Default: `7d`.                                                                              |
| `COOKIE_REFRESH_MAX_AGE` | —         | Max-age de la cookie del refresh token en **segundos**. Default: `604800` (7 días).                                       |
| `PORT`                   | —         | Puerto del servidor. Default: `3000`.                                                                                     |
| `CORS_ORIGIN`            | —         | Origen permitido (ej: `http://localhost:5173`). Si no se define, permite `localhost:5173`.                                |
| `TMDB_API_KEY`           | Sí        | API key de TMDB (JWT Bearer token). Obtener en [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).    |
| `ADMIN_USERNAME`         | Sí        | Username del usuario admin inicial. Usado por `prisma db seed`.                                                           |
| `ADMIN_PASSWORD`         | Sí        | Password del usuario admin inicial. Usado por `prisma db seed`.                                                           |
| `ORIGIN_SECRET`          | Prod      | Secret que Vercel envía como `x-origin-secret`. En producción la API no arranca sin él; en dev, vacío desactiva el guard. |
| `RATE_LIMIT_GLOBAL_MAX`  | —         | Máximo de requests por IP cada 15 min. Default: `300`.                                                                    |

### Cómo obtener las URLs de Supabase

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto
2. **Project Settings → Database → Connection string**
3. `DATABASE_URL` → usar la de **Transaction pooler** (puerto `6543`) + agregar `?pgbouncer=true`
4. `DIRECT_URL` → usar la de **Direct connection** (puerto `5432`)

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
