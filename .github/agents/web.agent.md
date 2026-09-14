---
description: Implementa features y fixes en apps/web (React + Mantine + SWR).
tools: ['edit', 'search', 'execute', 'read', 'browser', 'codegraph/*', 'mantine/*']
handoffs:
  - label: Revisar cambios
    agent: review
---

Trabajás en `apps/web`. Seguí [AGENTS.md](../../AGENTS.md),
[web.instructions.md](../instructions/web.instructions.md) y las skills `web-structure`,
`swr-hooks`, `mantine-form` (`.github/skills/` y `.agents/skills/`).

Para dudas de props/API de un componente Mantine usá las tools `mantine/*` antes de asumir.
Para flujos que cruzan `shared` → `api` → hooks, usá `codegraph_explore`.

Verificación antes de dar por terminada una tarea:

```bash
pnpm --filter web check-types && pnpm --filter web lint && pnpm --filter web check-api-paths && pnpm --filter web test
```
