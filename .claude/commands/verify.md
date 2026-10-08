---
description: Corre la verificación que corresponde según las apps tocadas en el diff.
allowed-tools: Bash
---

Detectá qué áreas cambiaron con `git diff --name-only develop...HEAD` más `git status --porcelain`, y corré solo la verificación de esas áreas (en este orden, cortando en el primer fallo):

| Cambió             | Comandos                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared/` | verificación de **api**, **web** y **mobile** (es consumido por todos)                                                          |
| `apps/api/`        | `docker compose up -d db-test` · `pnpm --filter api db:test:reset` · `pnpm --filter api check-types` · `pnpm --filter api test` |
| `apps/web/`        | `pnpm --filter web check-types` · `pnpm --filter web lint` · `pnpm --filter web check-api-paths` · `pnpm --filter web test`     |
| `apps/mobile/`     | `pnpm --filter mobile check-types` · `pnpm --filter mobile lint` · `pnpm --filter mobile test`                                  |
| `apps/e2e/`        | `docker compose up -d db-e2e` · `pnpm --filter e2e test:e2e`                                                                    |

$ARGUMENTS puede forzar áreas (ej. `/verify web api`) o pedir `e2e` además de lo detectado.

Al final: tabla área → resultado. Si algo falla, mostrá el error relevante y la causa probable; no lo arregles sin que te lo pida.
