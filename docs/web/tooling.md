# Web — tooling (scripts, Mantine)

Convenciones de `apps/web`: [apps/web/CLAUDE.md](../../apps/web/CLAUDE.md) (Claude Code lo carga al trabajar en esa carpeta). Índice general: [CLAUDE.md](../../CLAUDE.md).

## Mantine (web)

- Paquetes `@mantine/*` en **9.7.2** (`apps/web`), incluido `@mantine/lightbox`.
- `MantineProvider` usa `deduplicateInlineStyles` (React 19; no cubre `SimpleGrid`/`Grid`).
- Defaults de inputs vía `Input.extend` en `theme/components.tsx`.
- React Compiler: **no activado**. Spike diferido: [#29](https://github.com/Leancoggiola/omni/issues/29).

## Skills de terceros (`.claude/skills/`)

Instaladas como copia con el CLI y fijadas en `skills-lock.json`. No editarlas a mano; actualizar con:

```bash
npx skills add mantinedev/skills --skill mantine-form mantine-combobox mantine-custom-components --agent claude-code --copy -y
npx skills add supabase/agent-skills --skill supabase supabase-postgres-best-practices --agent claude-code --copy -y
```

| Skill                              | Cuándo usarla                   |
| ---------------------------------- | ------------------------------- |
| `mantine-form`                     | Formularios con `@mantine/form` |
| `mantine-combobox`                 | Dropdowns custom con Combobox   |
| `mantine-custom-components`        | `factory()`, Styles API         |
| `supabase`                         | Auth, CLI, integración Supabase |
| `supabase-postgres-best-practices` | SQL, índices, RLS               |

## Scripts

```bash
pnpm new-feature gym --web --register-route
pnpm new-feature gym --web --mobile --path /gym
pnpm --filter web check-api-paths
```

`new-feature` vive en `scripts/new-feature.mjs` (raíz) y genera web y/o mobile; sin `--web` ni `--mobile`, los dos. No hay generadores de hooks, componentes ni tests: con la convención de features (ver [docs/architecture.md](../architecture.md#estructura-de-features-web-y-mobile)) cada uno es un solo archivo. Flags y checklist: [new-feature.md](./new-feature.md).

## Verificación

```bash
pnpm --filter web check-types
pnpm --filter web lint
pnpm --filter web check-api-paths
pnpm --filter web test
```

Prioridad de tests: alta en `shared/api` y utils; media 1–2 smokes con `renderWithProviders`; baja por cada componente Mantine.

## Relación con mobile

Tooling paralelo: [mobile/tooling.md](../mobile/tooling.md). Contratos en `@omni/shared`.
