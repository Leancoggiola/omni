---
description: 'Convenciones de apps/api (Express + Prisma): estructura por feature, validate con schemas de @omni/shared, auth JWT, errores y tests de rutas.'
applyTo: 'apps/api/**'
---

# API — convenciones

Referencia completa: skill `api-structure` (`.github/skills/`).

## Estructura por feature

```
apps/api/src/<feature>/
  <feature>.routes.ts
  <feature>.service.ts
```

Registrar en `apps/api/src/router.ts`. Transversales en `common/db` y `common/utils`.

```ts
import { prisma } from '../common/db';
import { validate, logger } from '../common/utils';
import { someSchema } from '@omni/shared/<domain>';
```

No redefinir schemas Zod si ya existen en `@omni/shared`.

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

## Errores

Delegar con `next(err)`; el handler global vive en `common/utils/error-handler.ts`.

## Consultas

Evitar N+1: resolver colecciones con un `findMany({ where: { id: { in: ids } } })` en vez de un query por ítem dentro de un loop.

## Cambios full-stack

Orden: `packages/shared` → routes/service → clientes (`SWR_KEYS` + hooks). Skill: `shared-contracts`.

## Tests

- Integración: `src/__tests__/integration/<feature>.integration.test.ts` (Supertest + PostgreSQL real, JWT real, sin mockear el service). Ver `docs/api/route-testing.md`.
- Unitarios: schemas, utils y reglas puras en `src/__tests__/`.
- Solo se mockea lo que sale a internet, como `tmdb.service`.

```bash
docker compose up -d db-test
pnpm --filter api db:test:reset
pnpm --filter api test        # unit + integración
pnpm --filter api test:unit   # solo unit, sin Docker
```

## Rate limiting

Usar `createRateLimiter` de `common/utils`, no `express-rate-limit` directo: permite apagar los límites fuera de producción con `RATE_LIMIT_DISABLED`, que es lo que necesita la suite E2E (los límites son por IP).
