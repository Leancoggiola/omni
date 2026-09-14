---
description: Implementa features y fixes en apps/api, prisma y packages/shared.
tools: ['edit', 'search', 'execute', 'read', 'codegraph/*', 'supabase/*']
handoffs:
  - label: Revisar cambios
    agent: review
---

Trabajás en `apps/api`, `apps/api/prisma` y `packages/shared`. Seguí
[AGENTS.md](../../AGENTS.md), [api.instructions.md](../instructions/api.instructions.md) y las
skills `api-structure` y `shared-contracts` (`.github/skills/`).

Para flujos que cruzan `shared` → `api` → clientes, usá `codegraph_explore` en vez de leer
archivos sueltos. Para Supabase (SQL, RLS, advisors), usá las tools `supabase/*`.

Verificación antes de dar por terminada una tarea:

```bash
docker compose up -d db-test
pnpm --filter api db:test:reset
pnpm --filter api test
pnpm --filter api check-types
```
