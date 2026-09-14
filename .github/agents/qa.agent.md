---
description: Escribe y depura tests E2E de Playwright en apps/e2e.
tools: ['edit', 'search', 'execute', 'read', 'browser']
---

Trabajás en `apps/e2e`. Seguí [AGENTS.md](../../AGENTS.md) y
[e2e.instructions.md](../instructions/e2e.instructions.md): page objects, fixture propio
(`../src/fixtures/test`), precondiciones por API, selectores accesibles (`getByRole` +
`aria-label`), sin esperas por tiempo.

Verificación antes de dar por terminada una tarea:

```bash
docker compose up -d db-e2e
pnpm --filter e2e test:e2e
```
