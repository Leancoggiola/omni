# Web — tooling (instructions, skills, scripts)

**Índice agentes:** [AGENTS.md](../../AGENTS.md).

Instructions y skills propias de `apps/web` ya están indexadas en AGENTS.md; no se repiten acá.
Ver [web.instructions.md](../../.github/instructions/web.instructions.md) (aplica automáticamente
bajo `apps/web/**`).

## Mantine (web)

- Paquetes `@mantine/*` en **9.6.1** (`apps/web`), incluido `@mantine/lightbox`.
- `MantineProvider` usa `deduplicateInlineStyles` (React 19; no cubre `SimpleGrid`/`Grid`).
- Defaults de inputs vía `Input.extend` en `theme/components.tsx`.
- Skills oficiales (`mantine-form`, `mantine-combobox`, `mantine-custom-components`): actualizar solo con CLI (`npx skills add mantinedev/skills …`). No editar `.agents/skills/mantine-*` a mano.
- React Compiler: **no activado**. Spike diferido: [#29](https://github.com/Leancoggiola/omni/issues/29).

## Skills de terceros (`.agents/skills/`)

Instalados con `npx skills add`. No mover a `.github/skills/` (el CLI reinstala en `.agents/`).

| Skill                              | Cuándo usarla                   |
| ---------------------------------- | ------------------------------- |
| `mantine-form`                     | Formularios con `@mantine/form` |
| `mantine-combobox`                 | Dropdowns custom con Combobox   |
| `mantine-custom-components`        | `factory()`, Styles API         |
| `supabase`                         | Auth, CLI, integración Supabase |
| `supabase-postgres-best-practices` | SQL, índices, RLS               |

**Jerarquía:** rule = ley corta en el IDE · skill = procedimiento con ejemplos.

## Scripts

```bash
pnpm web:new-feature gym
pnpm web:new-feature gym --register-route --register-nav --nav-key gym --swr-domain gym
pnpm web:new-hook media library useMyMediaList
pnpm web:new-component profile settings ProfileCard
pnpm web:new-test src/features/.../profileForm.ts
pnpm --filter web check-api-paths
```

Flags y checklist: [new-feature.md](./new-feature.md).

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

CodeGraph: [codegraph.md](../tooling/codegraph.md).
