# Omni

Monorepo con **Turborepo** para media tracking personal: películas y series (TMDB), lista y estado. Clientes **web** y **mobile**; API Express + Prisma + PostgreSQL (Supabase).

## Stack

| Capa        | Tecnologías                                                             |
| ----------- | ----------------------------------------------------------------------- |
| **API**     | Express 5, TypeScript, Prisma, PostgreSQL (Supabase), Passport.js (JWT) |
| **Web**     | React 19, Vite, Mantine 9, SWR, React Router 7                          |
| **Mobile**  | Expo, Tamagui, SWR                                                      |
| **Shared**  | Zod + tipos (`@omni/shared`)                                            |
| **Tooling** | Turborepo, pnpm, ESLint, Prettier                                       |

## Docs y agentes

- [CLAUDE.md](./CLAUDE.md) — reglas de oro, skills, MCP, verificación
- [docs/README.md](./docs/README.md) — índice de documentación
- [docs/architecture.md](./docs/architecture.md) — monorepo + auth dual

## Estructura

```
apps/
  api/       → REST (Express + Prisma)
  web/       → SPA (Vite + Mantine)
  mobile/    → Expo Android (Tamagui)
packages/
  shared/    → @omni/shared
docs/        → Guías (ver docs/README.md)
CLAUDE.md    → contexto raíz para Claude Code (cada app tiene el suyo)
.claude/     → subagents, commands, skills, hooks y permisos
.mcp.json    → MCP del proyecto
```

## Requisitos

- Node.js ≥ 18
- pnpm ≥ 10 (`corepack enable`)
- PostgreSQL (Supabase recomendado)
- TMDB API key — [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)

## Setup

```bash
git clone <repo-url> && cd omni
pnpm install

cp apps/api/.env.example apps/api/.env
# Completar Supabase, JWT secrets, TMDB, ADMIN_* (ver docs/getting-started/env-setup.md)

cd apps/api
pnpm db:migrate
pnpm prisma db seed   # admin inicial
```

```bash
# Desde la raíz
pnpm dev              # API + Web
pnpm dev:api          # http://localhost:3000
pnpm dev:web          # http://localhost:5173 (proxy /api → API)
pnpm dev:mobile       # Expo
```

## Scripts

| Comando       | Descripción           |
| ------------- | --------------------- |
| `pnpm dev`    | API + Web (Turborepo) |
| `pnpm build`  | Build monorepo        |
| `pnpm lint`   | Lint                  |
| `pnpm format` | Prettier              |

DB (desde `apps/api/`): `pnpm db:migrate`, `pnpm db:studio`, `pnpm db:generate` — detalle en [docs/api/prisma.md](./docs/api/prisma.md).

## Auth (resumen)

- Registro público **no** existe: usuarios vía admin/seed.
- Login: **username** + password.
- Web: cookies `httpOnly`. Mobile: Bearer + SecureStore.
- Detalle: [docs/architecture.md](./docs/architecture.md) (auth dual).

## Deploy

Producción: API en Render, web en Vercel. Ver [docs/ops/deployment.md](./docs/ops/deployment.md).

| Servicio | URL                                  |
| -------- | ------------------------------------ |
| API      | `https://omni-api-gwer.onrender.com` |
| Web      | `https://omni-nest.vercel.app`       |
