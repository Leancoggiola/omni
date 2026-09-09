# Omni — guía para agentes

Monorepo de **media tracking** (películas/series vía TMDB). Clientes: **web** (React + Vite + Mantine + SWR) y **mobile** (Expo + Tamagui + SWR). API: Express + Prisma + PostgreSQL (Supabase).

**Leé este archivo al inicio de cualquier tarea no trivial** (feature, refactor, bug transversal, cambio de contrato API↔clientes).

---

## Mapa del repositorio

| Ruta                    | Rol                                            |
| ----------------------- | ---------------------------------------------- |
| `apps/api/`             | REST — `auth`, `media`, `users`, `admin`       |
| `apps/web/`             | SPA — `auth`, `home`, `media`, `profile`       |
| `apps/mobile/`          | Expo Android — paridad con web                 |
| `packages/shared/`      | Zod + tipos (`@omni/shared`)                   |
| `docs/`                 | Índice en `docs/README.md`                     |
| `.github/instructions/` | Convenciones por glob (`web`, `mobile`, `api`) |
| `.github/skills/`       | Skills del proyecto                            |
| `.github/prompts/`      | Prompts reutilizables (ej. code review)        |
| `.agents/skills/`       | Skills de terceros (Mantine, Supabase)         |
| `.vscode/mcp.json`      | MCP (CodeGraph, Supabase)                      |

> `@/shared` (alias del cliente) ≠ `@omni/shared` (paquete monorepo).

---

## Ramas

| Rama      | Uso                                                                                    |
| --------- | -------------------------------------------------------------------------------------- |
| `develop` | **Base de desarrollo.** Toda feature/chore parte de acá y abre PR **hacia `develop`**. |
| `main`    | Solo producción (releases) o **hotfix** urgente. No abrir PRs de feature a `main`.     |

Flujo: `develop` → branch `feat/#N-…` / `fix/#N-…` → PR a `develop` → (release) → `main`.

---

## Reglas de oro

0. **Estados de UI compartidos** — web: `LoadingState` / `EmptyState` / `ErrorState` de `@/shared/ui`. El `error` de SWR se renderiza siempre; nunca se muestra como estado vacío.
1. **Un feature no importa otro** del mismo cliente — UI compartida en `shared/ui` (web) o componentes locales (mobile).
2. **URLs HTTP centralizadas** — web: `SWR_KEYS`; mobile: `API_KEYS`. Nunca literales `/api/` en features.
3. **Contrato compartido** — `packages/shared`; API `validate()`; clientes mismos Zod/tipos.
4. **Orden full-stack** — `shared` → `api` → hooks + UI del cliente (web y/o mobile).
5. **Auth** — web: cookies; mobile: Bearer + SecureStore. Mismos endpoints; login/refresh también devuelven tokens en el body.
6. **Referencias** — web: `home` / `media` / `profile`; mobile: mismas features bajo `apps/mobile/src/features/`.
7. **Exploración transversal** — CodeGraph MCP antes de leer muchos archivos.

---

## Instructions automáticas

| Glob             | Archivo                                       |
| ---------------- | --------------------------------------------- |
| `apps/web/**`    | `.github/instructions/web.instructions.md`    |
| `apps/mobile/**` | `.github/instructions/mobile.instructions.md` |
| `apps/api/**`    | `.github/instructions/api.instructions.md`    |

Detalle: [docs/web/tooling.md](docs/web/tooling.md) · [docs/mobile/tooling.md](docs/mobile/tooling.md).

---

## Skills

| Tarea            | Skill                                          |
| ---------------- | ---------------------------------------------- |
| Features web     | `web-structure`                                |
| Hooks SWR web    | `swr-hooks`                                    |
| Features mobile  | `mobile-structure`                             |
| Hooks SWR mobile | `mobile-data-hooks`                            |
| API              | `api-structure`                                |
| Shared           | `shared-contracts`                             |
| Forms Mantine    | `mantine-form`                                 |
| Supabase         | `supabase`, `supabase-postgres-best-practices` |

Web usa **Mantine 9.4.1** con `deduplicateInlineStyles`. Skills `mantinedev/skills` se actualizan con CLI, no a mano. React Compiler: no activado ([#29](https://github.com/Leancoggiola/omni/issues/29)).

---

## CodeGraph

| Cuándo            | Tool                                    |
| ----------------- | --------------------------------------- |
| Callers / impacto | `codegraph_callers`, `codegraph_impact` |
| Flujo             | `codegraph_context`                     |
| Buscar símbolo    | `codegraph_search`                      |

Setup: [docs/tooling/codegraph.md](docs/tooling/codegraph.md).

---

## Documentación

| Doc                                                                                                      | Uso                    |
| -------------------------------------------------------------------------------------------------------- | ---------------------- |
| [docs/README.md](docs/README.md)                                                                         | Índice por carpetas    |
| [docs/architecture.md](docs/architecture.md)                                                             | Estructura + auth dual |
| [docs/web/tooling.md](docs/web/tooling.md) / [mobile/tooling.md](docs/mobile/tooling.md)                 | Rules/skills           |
| [docs/web/new-feature.md](docs/web/new-feature.md) / [mobile/new-feature.md](docs/mobile/new-feature.md) | Checklists             |
| [docs/product/project-management.md](docs/product/project-management.md)                                 | Omni Roadmap / issues  |

---

## Verificación

```bash
pnpm --filter web check-types && pnpm --filter web lint && pnpm --filter web check-api-paths && pnpm --filter web test
pnpm --filter mobile check-types && pnpm --filter mobile lint
```

Si tocaste API, los tests de integración necesitan la base efímera levantada:

```bash
docker compose up -d db-test
pnpm --filter api db:test:reset
pnpm --filter api test          # unit + integration
pnpm --filter api test:unit     # solo unit, sin Docker
```

Detalle en [docs/api/route-testing.md](docs/api/route-testing.md).

---

## Jerarquía

1. Este `AGENTS.md`
2. `.github/instructions/`
3. `docs/architecture.md`
4. `.github/skills/` / `.agents/skills/`
5. CodeGraph
