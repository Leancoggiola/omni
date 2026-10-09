# Architecture

Monorepo con **pnpm workspaces** y **Turborepo**. Ambas apps siguen la misma convención de estructura de carpetas para facilitar el onboarding.

**Agentes:** [CLAUDE.md](../CLAUDE.md) · [web/tooling.md](./web/tooling.md).

---

## Estructura del monorepo

```
omni/
  apps/
    api/        ← Express API (Node.js + TypeScript)
    web/        ← React SPA (Vite + TypeScript)
    mobile/     ← Expo Android (Router + Tamagui)
  packages/
    shared/     ← Tipos y schemas compartidos (@omni/shared)
    eslint-config/
    typescript-config/
  docs/         ← Esta carpeta
  CLAUDE.md       ← Contexto raíz para Claude Code (+ un CLAUDE.md por app)
  .claude/        ← Subagents, commands, skills (propias y de terceros), hooks, permisos
  .mcp.json       ← MCP del proyecto (Supabase, CodeGraph, Mantine)
  .codegraph/     ← Índice CodeGraph (local, no commitear *.db)
```

---

## `apps/api/src/`

```
src/
  common/                 ← Utilidades transversales
    db/
      prisma.ts           ← PrismaClient singleton
      index.ts
    utils/
      logger.ts           ← Pino logger
      error-handler.ts    ← Express error handler middleware
      validate.ts         ← Zod validation middleware
      index.ts
    index.ts              ← Barril: re-exporta db + utils
  auth/                   ← Feature ejemplo: routes + service (+ middleware/, strategies/)
    auth.routes.ts
    auth.service.ts
  <resto de features>/    ← Mismo patrón routes+service — ver router.ts y skill `api-structure`
  generated/
    prisma/               ← Cliente Prisma generado (no editar)
  config.ts               ← Variables de entorno validadas
  main.ts                 ← Bootstrap de Express
  router.ts               ← Router principal
  __tests__/              ← Tests de utilidades comunes
```

### Convenciones API

| Carpeta/archivo  | Convención                                                     |
| ---------------- | -------------------------------------------------------------- |
| Cada feature     | `feature.routes.ts` + `feature.service.ts`                     |
| Imports de DB    | `import { prisma } from "../common/db"`                        |
| Imports de utils | `import { validate, logger } from "../common/utils"`           |
| Naming           | `camelCase` para funciones, `PascalCase` para interfaces/types |

Detalle de la lista real de features y checklist para agregar una nueva: skill `api-structure`.

---

## `apps/web/src/`

```
src/
  app/
    router.tsx
    routes.ts
    navigation/
      nav-registry.tsx
  features/               ← Dominio de producto (1 navbar item = 1 feature)
    home/ · auth/ · media/ · profile/ · ...
  shared/
    api/                  ← client, fetcher, SWR_KEYS
    ui/                   ← componentes cross-feature (UserAvatar, …)
  core/
    auth/
    guards/
    providers/
  layouts/
    RootLayout.tsx
    AuthLayout.tsx
    components/           ← Navbar, Header, …
  theme/
  assets/
  main.tsx
```

Cada feature usa `modules/<nombre>/` (sub-dominios), carpetas por componente/hook y barrels `index.ts`. Ver [web/new-feature.md](./web/new-feature.md).

### Convenciones Web

| Elemento     | Convención                                                                 |
| ------------ | -------------------------------------------------------------------------- |
| Feature      | `<name>.page.tsx`, `<name>.routes.tsx` (navbar: `@omni/shared/navigation`) |
| Componentes  | `Component/Component.tsx` + `index.ts`                                     |
| Hooks        | `useX/useX.ts` + `index.ts`                                                |
| Imports      | `@/shared/api`, `@/core/auth`, `@/features/media`                          |
| Dependencias | Un feature **no** importa otro feature                                     |

### Path aliases

`@/*` → `src/*` (y subpaths `@/features`, `@/shared`, `@/core`, `@/layouts`, `@/theme`, `@/assets`).

> `@/shared` (frontend) ≠ `@omni/shared` (paquete monorepo de tipos/schemas).

---

## Paralelo Web ↔ API

| Concepto               | API                                         | Web                                                      |
| ---------------------- | ------------------------------------------- | -------------------------------------------------------- |
| Utilidades compartidas | `common/db/`, `common/utils/`               | `shared/api/`                                            |
| Módulos de producto    | `auth/`, `media/`, `users/`                 | `features/auth/`, `features/media/`, `features/profile/` |
| Setup global           | `config.ts`, `main.ts`                      | `core/`, `layouts/`, `main.tsx`                          |
| Servicios              | `*.service.ts`                              | hooks en `features/*/modules/*/hooks/`                   |
| Validación             | `common/utils/validate.ts` (Zod middleware) | Schemas de `@omni/shared`                                |
| Auth                   | Cookie **o** Bearer JWT                     | Cookies `httpOnly` + `credentials: 'include'`            |

### Auth dual (web + mobile)

`POST /api/auth/login` y `POST /api/auth/refresh`:

- Siempre setean cookies (compat web).
- Siempre incluyen `accessToken` y `refreshToken` en el JSON (`AuthTokensResponse` en `@omni/shared/auth`).
- Rutas protegidas: Passport acepta cookie `access_token` **o** header `Authorization: Bearer`.
- Refresh: cookie `refresh_token`, Bearer, o body `{ refreshToken }` (`refreshTokenBodySchema`).
- Logout: access por cookie/Bearer; refresh a revocar por cookie o body.

Web ignora los tokens del body. Mobile los guarda (SecureStore) y no depende de cookies.

---

## Agregar una nueva feature

- **API:** carpeta `src/<feature>/` con routes + service; registrar en `router.ts`.
- **Web:** [web/new-feature.md](./web/new-feature.md) · tooling [web/tooling.md](./web/tooling.md).
- **Mobile:** [mobile/new-feature.md](./mobile/new-feature.md).

---

## Shared UI (Web)

Componentes usados en 2+ features → `shared/ui/<Component>/`.

---

## `packages/shared/`

Tipos y schemas compartidos entre API, Web y Mobile. Importan desde `@omni/shared`.

```
shared/src/
  auth/     ← LoginPayload, ProfileResponse, User, schemas Zod
  media/    ← MediaItem, tipos de media, schemas
  users/    ← UpdateProfilePayload, UserStats, schemas
  index.ts
```
