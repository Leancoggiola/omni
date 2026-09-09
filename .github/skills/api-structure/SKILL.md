---
name: api-structure
description: Folder structure and conventions for apps/api (Express features, Prisma, validation). Use when creating or modifying routes, services, or features under apps/api/src. Triggers on auth.routes, media.service, router.ts, validate middleware, or new API feature.
---

# API structure — omni

## Layout

```
apps/api/src/
  common/db/          prisma singleton
  common/utils/       validate, logger, error-handler, rate-limit
  <feature>/
    <feature>.routes.ts
    <feature>.service.ts
  config.ts
  main.ts
  router.ts
```

Features actuales: `auth`, `media`, `users`, `admin`, `gym`, `pantry`, `expenses`, `split-expenses`, `notifications`.

## Nuevo feature

1. Crear `src/<feature>/<feature>.routes.ts` y `<feature>.service.ts`
2. `router.use('/<feature>', featureRoutes)` en `router.ts`
3. Schemas en `packages/shared/src/<domain>/` si el contrato es compartido con web
4. Tests de integración en `src/__tests__/integration/<feature>.integration.test.ts` (ver `docs/api/route-testing.md`)
5. Tests unitarios en `src/__tests__/` si hay lógica en utils o schemas críticos

## Tests (resumen)

| Capa        | Archivo                                       | Mock service | BD  |
| ----------- | --------------------------------------------- | ------------ | --- |
| Integración | `__tests__/integration/*.integration.test.ts` | No           | Sí  |
| Unitarios   | `__tests__/*.test.ts`                         | No           | No  |

Solo se mockea lo que sale a internet (por ejemplo `tmdb.service`). Cada test corre dentro de una
transacción que se revierte, contra el contenedor `db-test`.

```bash
docker compose up -d db-test
pnpm --filter api db:test:reset
pnpm --filter api test
```

Patrón completo: [docs/api/route-testing.md](../../docs/api/route-testing.md).

## Service vs routes

- **routes:** HTTP, `validate`, middleware auth, `res.json`, `next(err)`
- **service:** Prisma, TMDB, reglas de negocio, sin `req`/`res`

## Prisma

Schema: `apps/api/prisma/schema.prisma`. Cliente: `import { prisma } from '../common/db'`. No editar `src/generated/`.

Migraciones desde `apps/api/`: `pnpm db:migrate`. Ver `docs/api/prisma.md`.

## Auth (web + mobile)

- **Web:** cookies `httpOnly` (`access_token`, `refresh_token`) + `credentials: 'include'`.
- **Mobile:** mismos endpoints; usa `accessToken` / `refreshToken` del body de login/refresh; guarda en SecureStore; manda `Authorization: Bearer <access>`.
- Passport JWT lee cookie **o** Bearer. Refresh también acepta body `{ refreshToken }`.
- Tipos: `AuthTokensResponse`, `refreshTokenBodySchema` en `@omni/shared/auth`.

## Rate limiting

Usar `createRateLimiter` de `common/utils`, no `express-rate-limit` directo: permite apagar los límites fuera de producción con `RATE_LIMIT_DISABLED`, que es lo que necesita la suite E2E (los límites son por IP). Patrón existente en `auth.routes.ts`, `media.routes.ts`, `users.routes.ts`.

## Docs

- `docs/architecture.md` — paralelo Web ↔ API
- `docs/api/route-testing.md` — tests de integración contra PostgreSQL real
- `docs/tooling/e2e.md` — suite E2E de la web
- `.github/instructions/api.instructions.md`
