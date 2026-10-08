# Omni

Monorepo de **media tracking** (películas/series vía TMDB). Clientes: **web** (React + Vite + Mantine + SWR) y **mobile** (Expo + Tamagui + SWR). API: Express + Prisma + PostgreSQL (Supabase).

Cada app tiene su propio `CLAUDE.md` con sus convenciones; se carga al trabajar en esa carpeta.

---

## Mapa del repositorio

| Ruta                    | Rol                                                     |
| ----------------------- | ------------------------------------------------------- |
| `apps/api/`             | REST — 10 features en `src/*`, ver `router.ts`          |
| `apps/web/`             | SPA — `auth`, `home`, `media`, `profile`                |
| `apps/mobile/`          | Expo Android — paridad con web                          |
| `apps/e2e/`             | Suite E2E de la web (Playwright)                        |
| `packages/shared/`      | Zod + tipos (`@omni/shared`)                            |
| `docs/`                 | Índice en `docs/README.md`                              |
| `.claude/agents/`       | Subagents: `review` (read-only), `qa` (E2E)             |
| `.claude/commands/`     | `/verify`, `/review`, `/new-feature`                    |
| `.claude/skills/`       | `swr-hooks` (propia) + Mantine/Supabase (terceros, CLI) |
| `.claude/settings.json` | Permisos y hook de Prettier                             |
| `.mcp.json`             | MCP: `supabase`, `codegraph`, `mantine`, `playwright`   |

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

0. **Estados de UI compartidos** — web y mobile: `LoadingState` / `EmptyState` / `ErrorState` de `@/shared/ui`. El `error` de SWR se renderiza siempre; nunca se muestra como estado vacío.
1. **Un feature no importa otro** del mismo cliente — la UI compartida vive en `@/shared/ui` (web y mobile, misma API: `PageHeader`↔`ScreenHeader`, `notify*`, `confirm`).
2. **URLs HTTP centralizadas** — web: `SWR_KEYS`; mobile: `API_KEYS`. Nunca literales `/api/` en features.
3. **Contrato compartido** — `packages/shared`; API `validate()`; clientes mismos Zod/tipos.
4. **Color y tokens** — todo nace en `packages/shared/src/theme/tokens.ts`. Nunca hex sueltos ni `color="green"`/`"blue"` de Mantine: usar los alias semánticos. Ver [docs/design-system.md](docs/design-system.md).
5. **Orden full-stack** — `shared` → `api` → hooks + UI del cliente (web y/o mobile).
6. **Auth** — web: cookies; mobile: Bearer + SecureStore. Mismos endpoints; login/refresh también devuelven tokens en el body.
7. **Referencias** — web: `home` / `media` / `profile`; mobile: mismas features bajo `apps/mobile/src/features/`.
8. **Exploración transversal** — flujo o impacto cruzando `api`/`shared`/`web`/`mobile`: `codegraph_explore` (una sola llamada), nunca `sync` manual. Referencias de un símbolo dentro de un proyecto → Grep.

---

## Skills

| Tarea         | Skill                                                              |
| ------------- | ------------------------------------------------------------------ |
| Hooks SWR web | `swr-hooks`                                                        |
| Forms Mantine | `mantine-form` (+ `mantine-combobox`, `mantine-custom-components`) |
| Supabase      | `supabase`, `supabase-postgres-best-practices`                     |

Las de Mantine/Supabase son de terceros: se actualizan con `npx skills add … --agent claude-code --copy -y` (comandos en `docs/web/tooling.md`), nunca a mano (`skills-lock.json` fija versiones). Web usa **Mantine 9.6.1** con `deduplicateInlineStyles`. React Compiler: no activado ([#29](https://github.com/Leancoggiola/omni/issues/29)).

---

## MCP y tooling por máquina

- **`codegraph`** — una sola tool, `codegraph_explore`: símbolos, call paths y blast radius en una llamada. Es punto de entrada, no herramienta de iteración: una llamada por tarea, sin releer lo que ya devolvió, y formulada como flujo ("flujo JWT refresh shared→api→web"), no como ubicación. Setup: `pnpm codegraph:init` (índice local en `.codegraph/`, gitignored); auto-sync por file watcher, `pnpm codegraph:status` si sospechás desfase.
- **Arranque de MCP** — `codegraph` y `mantine` corren con `npx -y`: en frío (caché vacío) pueden pasar los 30 s por defecto. `.claude/settings.json` fija `MCP_TIMEOUT=90000`; si igual fallan, reconectar con `/mcp`.
- **`supabase`** — SQL, RLS, advisors. Requiere `SUPABASE_ACCESS_TOKEN` en el entorno.
- **`mantine`** — props/Styles API en vivo de la versión exacta del repo.
- **`playwright`** — revisión visual de la web (Chromium con ventana). Requiere `dev:api-web` corriendo; login con `ADMIN_USERNAME`/`ADMIN_PASSWORD` de `apps/api/.env` (admin del seed en la base de dev; las de `.env.e2e` no existen ahí). Revisar claro y oscuro; forzar errores interceptando requests con `page.route` (vía `browser_run_code_unsafe`) en vez de tocar código. Capturas en `.playwright-mcp/` (gitignored). Para flujos repetibles, specs en `apps/e2e`, no MCP.
- Las definiciones de tools MCP pesan en cada request: deshabilitar `supabase`/`mantine`/`playwright` (`/mcp`) fuera de sesiones de DB, de `apps/web` o de revisión de UI.
- **RTK** (opcional, por máquina) — comprime el output de los comandos Bash. Instalar: `winget install rtk-ai.rtk` y `rtk init -g` (registra el hook en `~/.claude/settings.json`; no está en el repo). Comandos persistentes (`vite`, `expo start`, `turbo run dev`) se excluyen en `%APPDATA%\rtk\config.toml`.

---

## Documentación

| Doc                                                                                                      | Uso                     |
| -------------------------------------------------------------------------------------------------------- | ----------------------- |
| [docs/README.md](docs/README.md)                                                                         | Índice por carpetas     |
| [docs/architecture.md](docs/architecture.md)                                                             | Estructura + auth dual  |
| [docs/design-system.md](docs/design-system.md)                                                           | Paleta, tokens, paridad |
| [docs/web/tooling.md](docs/web/tooling.md) / [mobile/tooling.md](docs/mobile/tooling.md)                 | Scripts                 |
| [docs/web/new-feature.md](docs/web/new-feature.md) / [mobile/new-feature.md](docs/mobile/new-feature.md) | Checklists              |
| [docs/product/project-management.md](docs/product/project-management.md)                                 | Omni Roadmap / issues   |
| [docs/api/route-testing.md](docs/api/route-testing.md)                                                   | Integración de API      |
| [docs/tooling/e2e.md](docs/tooling/e2e.md)                                                               | Suite E2E de la web     |

---

## Verificación

```bash
pnpm --filter web check-types && pnpm --filter web lint && pnpm --filter web check-api-paths && pnpm --filter web test
pnpm --filter mobile check-types && pnpm --filter mobile lint && pnpm --filter mobile test
```

Si tocaste API, los tests de integración necesitan la base efímera levantada:

```bash
docker compose up -d db-test
pnpm --filter api db:test:reset
pnpm --filter api test          # unit + integration
pnpm --filter api test:unit     # solo unit, sin Docker
```

Detalle en [docs/api/route-testing.md](docs/api/route-testing.md).

Si tocaste web o API y querés correr los flujos de punta a punta:

```bash
docker compose up -d db-e2e
pnpm --filter e2e test:e2e
```

Detalle en [docs/tooling/e2e.md](docs/tooling/e2e.md). `/verify` corre lo que corresponde según el diff.

---

## Jerarquía

1. Este `CLAUDE.md`
2. `CLAUDE.md` de la app (`apps/*/CLAUDE.md`, `packages/shared/CLAUDE.md`)
3. `docs/architecture.md`
4. Skills (`.claude/skills/`)
5. CodeGraph
