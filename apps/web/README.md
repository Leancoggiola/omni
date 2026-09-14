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

La web hace proxy de `/api` → `http://localhost:3000`.

## Estructura

Ver [docs/architecture.md](../../docs/architecture.md) (sección `apps/web`).

- **Nuevo feature:** [docs/web/new-feature.md](../../docs/web/new-feature.md)
- **Rule + script:** [docs/web/tooling.md](../../docs/web/tooling.md)

```bash
pnpm web:new-feature gym --register-route
```

## Scripts

| Comando                         | Descripción         |
| ------------------------------- | ------------------- |
| `pnpm --filter web dev`         | Dev server          |
| `pnpm --filter web build`       | Build producción    |
| `pnpm --filter web check-types` | TypeScript          |
| `pnpm --filter web test`        | Vitest              |
| `pnpm web:new-feature <name>`   | Scaffold de feature |
