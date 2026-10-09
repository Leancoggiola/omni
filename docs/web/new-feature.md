# Nuevo feature en Web

Checklist para agregar un dominio de producto (ej. Gimnasio, Gastos).

## 1. Scaffold (recomendado)

```bash
pnpm web:new-feature gym --path /gym --register-route
```

Ver [tooling.md](./tooling.md).

> **Git Bash en Windows:** MSYS convierte `/gym` en una ruta de Windows (`C:/Program Files/Git/gym`) y el script lo rechaza. Correrlo con `MSYS_NO_PATHCONV=1 pnpm web:new-feature …` o desde PowerShell.

El script inserta los imports en orden alfabético y registra la ruta sin depender de los vecinos actuales; si no encuentra dónde, falla con un mensaje en vez de dejar el registro a medias.

## 2. Estructura mínima

```
features/<name>/
  <name>.routes.tsx
  <name>.page.tsx
  index.ts
  modules/<module>/
    components/<Component>/<Component>.tsx + index.ts
    hooks/useThing/useThing.ts + index.ts
  modules/_shared/          # opcional, código entre módulos
```

## 3. Registrar ruta

En [`apps/web/src/app/routes.ts`](../../apps/web/src/app/routes.ts):

```ts
import { gymRoute } from '@/features/gym';

export const protectedRoutes = [homeRoute, mediaRoute, profileRoute, gymRoute];
```

## 4. Registrar navbar

1. Agregar la clave en `NAV_REGISTRY` y `MAIN_NAV_ORDER` de [`@omni/shared/navigation`](../../packages/shared/src/navigation/registry.ts), con `"web"` en `availableOn` (sin él, el ítem queda deshabilitado)
2. Ícono en `NAV_ICONS` de [`nav-registry.tsx`](../../apps/web/src/app/navigation/nav-registry.tsx) (y de mobile, [`navIcons.ts`](../../apps/mobile/src/shared/navigation/navIcons.ts))

## 5. Datos (SWR)

- Keys en [`shared/api/keys.ts`](../../apps/web/src/shared/api/keys.ts)
- Hooks en `features/<name>/modules/<module>/hooks/`
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

| Feature   | Cuándo copiar                                                        |
| --------- | -------------------------------------------------------------------- |
| `home`    | Feature simple, un módulo, sin SWR                                   |
| `media`   | Multi-módulo (`search`, `library`, `_shared`), hooks SWR + mutations |
| `profile` | Forms Mantine, PATCH utils, `useProfile`, security actions           |
