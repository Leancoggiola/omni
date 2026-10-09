---
description: Implementa una feature nueva siguiendo el orden shared → api → clientes.
argument-hint: <descripción de la feature> [web|mobile|ambos]
---

Feature: $ARGUMENTS

Antes de escribir código, confirmá conmigo: nombre del feature, clientes afectados (web, mobile o ambos), endpoints y si el contrato es nuevo. No asumas.

Después seguí este orden, saltando los pasos que no apliquen:

1. **Contrato** (`packages/shared`) — schemas Zod y tipos en `src/<domain>/`, re-export en `index.ts`. Ver `packages/shared/CLAUDE.md`.
2. **API** (`apps/api`) — `src/<feature>/<feature>.routes.ts` + `<feature>.service.ts`, registrar en `src/router.ts`, `validate(schema)`, `authenticateJwt`, `createRateLimiter` si es público. Si hay modelo nuevo: `prisma/schema.prisma` + `pnpm db:migrate`. Tests de integración en `src/__tests__/integration/<feature>.integration.test.ts`.
3. **Web** (`apps/web`) — `pnpm web:new-feature <name> --register-route` (ítem de navegación en `@omni/shared/navigation`), keys en `SWR_KEYS`, hooks con la skill `swr-hooks`, UI con los estados de `@/shared/ui`. Checklist: `docs/web/new-feature.md`.
4. **Mobile** (`apps/mobile`) — `src/features/<name>/`, ruta en `app/`, keys en `API_KEYS`. Checklist: `docs/mobile/new-feature.md`.
5. **E2E** — si el flujo es crítico en web, proponé un spec y delegalo al subagent `qa`.

Cerrá con `/verify` y `/review`.
