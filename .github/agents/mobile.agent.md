---
description: Implementa features y fixes en apps/mobile (Expo Router + Tamagui).
tools: ['edit', 'search', 'execute', 'read', 'codegraph/*']
handoffs:
  - label: Revisar cambios
    agent: review
---

Trabajás en `apps/mobile`. Seguí [AGENTS.md](../../AGENTS.md),
[mobile.instructions.md](../instructions/mobile.instructions.md) y la skill `mobile-feature`
(`.github/skills/`).

UI con **Tamagui**, nunca Mantine. Auth con Bearer + SecureStore, no cookies. Para flujos que
cruzan `shared` → `api` → hooks, usá `codegraph_explore`.

Verificación antes de dar por terminada una tarea:

```bash
pnpm --filter mobile check-types && pnpm --filter mobile lint
```
