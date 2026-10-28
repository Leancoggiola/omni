---
description: Implementa una feature nueva siguiendo el orden shared → api → clientes.
argument-hint: <descripción de la feature> [web|mobile|ambos]
---

Feature: $ARGUMENTS

Antes de escribir código, confirmá conmigo: nombre del feature, clientes afectados (web, mobile o ambos), endpoints y si el contrato es nuevo. No asumas.

Después seguí este orden, saltando los pasos que no apliquen:

1. **Contrato** (`packages/shared`) — schemas Zod y tipos en `src/<domain>/`, re-export en `index.ts`. Ver `packages/shared/CLAUDE.md`.
2. **API** (`apps/api`) — `src/<feature>/<feature>.routes.ts` + `<feature>.service.ts`, registrar en `src/router.ts`, `validate(schema)`, `authenticateJwt`, `createRateLimiter` si es público. Si hay modelo nuevo: `prisma/schema.prisma` + `pnpm db:migrate`. Tests de integración en `src/__tests__/integration/<feature>.integration.test.ts`.
3. **Scaffold** — `pnpm new-feature <name> [--web] [--mobile] [--register-route]` desde la raíz (sin `--web` ni `--mobile`, los dos clientes). Genera solo el punto de entrada e `index.ts`; el resto sigue la convención de features de `docs/architecture.md` (`components/`, `hooks/useX.ts` un hook por archivo, `utils/`, barrel solo en `index.ts`). Hay una migración en curso (#122): no copiar la estructura de features viejas que todavía tengan barrels por carpeta.
4. **Web** (`apps/web`) — ítem de navegación en `@omni/shared/navigation`, keys en `SWR_KEYS`, hooks en `hooks/` con la skill `swr-hooks`, UI con los estados de `@/shared/ui`. Checklist: `docs/web/new-feature.md`.
5. **Mobile** (`apps/mobile`) — `src/features/<name>/` con `<Name>Screen.tsx`, ruta en `app/` que importa `@/features/<name>`, `NAV_HREFS`/`NAV_ICONS`, keys en `API_KEYS`. Checklist: `docs/mobile/new-feature.md`.
6. **E2E** — si el flujo es crítico en web, proponé un spec y delegalo al subagent `qa`.

Cerrá con `/verify` y `/review`.
