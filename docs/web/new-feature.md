# Nuevo feature en Web

Checklist para agregar un dominio de producto (ej. Gimnasio, Gastos). Para mobile: [mobile/new-feature.md](../mobile/new-feature.md).

## 1. Scaffold (recomendado)

```bash
pnpm new-feature gym --web --path /gym --register-route
```

Sin `--web` ni `--mobile` genera los dos clientes. `--path` (por defecto `/<name>`) y `--register-route` son solo de web. Ver [tooling.md](./tooling.md).

> **Git Bash en Windows:** MSYS convierte `/gym` en una ruta de Windows (`C:/Program Files/Git/gym`) y el script lo rechaza. Correrlo con `MSYS_NO_PATHCONV=1 pnpm new-feature …` o desde PowerShell.

Genera solo `gym.page.tsx`, `gym.routes.tsx` e `index.ts`, sin carpetas vacías ni `modules/`. Con `--register-route` inserta el import en orden alfabético y registra la ruta sin depender de los vecinos actuales; si no encuentra dónde, falla con un mensaje en vez de dejar el registro a medias.

## 2. Estructura

```
features/<name>/
  <page>.page.tsx           punto de entrada (en general <page> = <name>)
  <name>.routes.tsx
  index.ts                  único barrel: exporta la ruta
  types.ts                  opcional
  components/Componente.tsx
  components/Compuesto/     solo si tiene auxiliares, sin index.ts
  hooks/useX.ts             un hook por archivo
  utils/x.ts
  __tests__/
  modules/<m>/              solo con ≥ 2 subdominios con UI propia; misma forma, sin index
```

Reglas completas (barrels, carpetas, hooks) en [apps/web/CLAUDE.md](../../apps/web/CLAUDE.md#estructura).

> **Migración en curso ([#122](https://github.com/Leancoggiola/omni/issues/122)):** el código nuevo sigue esta convención; las features existentes se migran en los PRs siguientes del issue, así que todavía pueden no servir de ejemplo de estructura.

## 3. Registrar ruta

Si no se usó `--register-route`, en [`apps/web/src/app/routes.ts`](../../apps/web/src/app/routes.ts):

```ts
import { gymRoute } from '@/features/gym';

export const protectedRoutes = [homeRoute, mediaRoute, profileRoute, gymRoute];
```

## 4. Registrar navbar

1. Agregar la clave en `NAV_REGISTRY` y `MAIN_NAV_ORDER` de [`@omni/shared/navigation`](../../packages/shared/src/navigation/registry.ts), con `"web"` en `availableOn` (sin él, el ítem queda deshabilitado)
2. Ícono en `NAV_ICONS` de [`nav-registry.tsx`](../../apps/web/src/app/navigation/nav-registry.tsx) (y de mobile, [`navIcons.ts`](../../apps/mobile/src/shared/navigation/navIcons.ts))

## 5. Datos (SWR)

- Keys en `API_PATHS` de [`@omni/shared/api`](../../packages/shared/src/api/paths.ts) (web los usa como `SWR_KEYS`)
- Hooks en `features/<name>/hooks/useX.ts` (o `features/<name>/modules/<m>/hooks/`), con la skill `swr-hooks`
- Import: `import { api, SWR_KEYS } from '@/shared/api'`

## 6. UI compartida

Si un componente lo usan 2+ features → `shared/ui/`, no copiar desde otro feature.

## 7. Verificar

```bash
pnpm --filter web check-types
pnpm --filter web lint
pnpm --filter web check-api-paths
pnpm --filter web test
```

## Referencia

| Feature          | Cuándo copiar                                                     |
| ---------------- | ----------------------------------------------------------------- |
| `home`           | Feature simple, sin SWR                                           |
| `media`          | Hooks SWR + mutations                                             |
| `profile`        | Forms Mantine, PATCH utils, `useProfile`, security actions        |
| `split-expenses` | CRUD anidado (ver [apps/web/CLAUDE.md](../../apps/web/CLAUDE.md)) |
