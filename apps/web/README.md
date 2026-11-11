# Web — Omni

Frontend SPA para media tracking y módulos Omni.

## Stack

React 19 · Vite · Mantine 9 · SWR · React Router 7 · TypeScript

## Desarrollo

```bash
# Desde la raíz del monorepo
pnpm dev

# Solo web (http://localhost:5173)
pnpm dev:web
```

La web hace proxy de `/api` → `http://localhost:3000` (o `API_PORT`, si está definido).

## Estructura

Convenciones y reglas de la app: [CLAUDE.md](./CLAUDE.md). Árbol y capas: [docs/architecture.md](../../docs/architecture.md) (sección `apps/web`).

- **Nuevo feature:** [docs/web/new-feature.md](../../docs/web/new-feature.md)
- **Rule + script:** [docs/web/tooling.md](../../docs/web/tooling.md)

```bash
pnpm new-feature gym --web --path /gym --register-route
```

## Scripts

Desde `apps/web` (o con `pnpm --filter web <script>` desde la raíz):

| Comando                             | Descripción                               |
| ----------------------------------- | ----------------------------------------- |
| `pnpm --filter web dev`             | Dev server                                |
| `pnpm --filter web build`           | Build producción (`tsc` + `vite build`)   |
| `pnpm --filter web preview`         | Sirve el build de producción              |
| `pnpm --filter web check-types`     | TypeScript                                |
| `pnpm --filter web lint`            | ESLint sobre `src/`                       |
| `pnpm --filter web check-api-paths` | Verifica que no haya paths `/api` sueltos |
| `pnpm --filter web test`            | Vitest                                    |
| `pnpm --filter web check-structure` | Verifica la estructura de features        |
| `pnpm --filter web test:watch`      | Vitest en modo watch                      |
| `pnpm --filter web test:coverage`   | Vitest con coverage                       |

Generador desde la raíz: `pnpm new-feature <name> [--web] [--mobile] [--path /x] [--register-route]` (web y/o mobile).
