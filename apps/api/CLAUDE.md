# API — convenciones

Nueva feature: `/new-feature`. Contratos: `packages/shared/CLAUDE.md`.

## Estructura

```
apps/api/src/
  common/db/          prisma singleton
  common/utils/       validate, logger, error-handler, rate-limit
  <feature>/
    <feature>.routes.ts   HTTP, validate, middleware auth, res.json, next(err)
    <feature>.service.ts  Prisma, TMDB, reglas de negocio — sin req/res
  config.ts · main.ts · router.ts
```

Features: `auth`, `media`, `users`, `admin`, `gym`, `pantry`, `expenses`, `split-expenses`, `notifications`, `holidays`. Registrar en `src/router.ts` con `router.use('/<feature>', featureRoutes)`.

```ts
import { prisma } from '../common/db';
import { validate, logger } from '../common/utils';
import { someSchema } from '@omni/shared/<domain>';
```

No redefinir schemas Zod si ya existen en `@omni/shared`.

## Prisma

Schema: `prisma/schema.prisma`. No editar `src/generated/`. Migraciones desde `apps/api/`: `pnpm db:migrate` — ver `docs/api/prisma.md`.

## Validación

`validate(schema)` para body; `validate(schema, 'query')` para query params.

```ts
router.post('/list', validate(addMediaItemSchema), async (req, res, next) => { ... });
```

> `validate` define `req.query` como propiedad propia para que la coerción de Zod persista: en Express 5 el getter de `req.query` reparsea el query string en **cada** acceso y descartaría los valores convertidos.

## Auth

- Rutas protegidas: `authenticateJwt` (cookie `access_token` **o** `Authorization: Bearer`).
- Login/refresh: setean cookies (web) **y** devuelven `accessToken` + `refreshToken` en el JSON (mobile).
- Refresh acepta token por cookie, Bearer o body `{ refreshToken }`.
- Admin: `authenticateJwt` + `requireAdmin`.
- Tipos: `AuthTokensResponse`, `refreshTokenBodySchema` en `@omni/shared/auth`.

## Errores

Delegar con `next(err)`; el handler global vive en `common/utils/error-handler.ts`.

## Consultas

Evitar N+1: resolver colecciones con un `findMany({ where: { id: { in: ids } } })` en vez de un query por ítem dentro de un loop.

## Rate limiting

Usar `createRateLimiter` de `common/utils`, no `express-rate-limit` directo: permite apagar los límites fuera de producción con `RATE_LIMIT_DISABLED`, que es lo que necesita la suite E2E (los límites son por IP). Patrón en `auth.routes.ts`, `media.routes.ts`, `users.routes.ts`.

## Tests

| Capa        | Archivo                                        | Mock service | BD  |
| ----------- | ---------------------------------------------- | ------------ | --- |
| Integración | `__tests__/integration/*.integration.test.ts`  | No           | Sí  |
| Unitarios   | `__tests__/*.test.ts` (schemas, utils, reglas) | No           | No  |

Supertest + PostgreSQL real + JWT real; cada test corre en una transacción que se revierte contra `db-test`. Solo se mockea lo que sale a internet (`tmdb.service`). Patrón completo: `docs/api/route-testing.md`.

```bash
docker compose up -d db-test
pnpm --filter api db:test:reset
pnpm --filter api test        # unit + integración
pnpm --filter api test:unit   # solo unit, sin Docker
```
