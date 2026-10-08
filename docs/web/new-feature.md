# Nuevo feature en Web

Checklist para agregar un dominio de producto (ej. Gimnasio, Gastos).

## 1. Scaffold (recomendado)

```bash
pnpm web:new-feature gym --path /gym --register-route --register-nav
```

Ver [tooling.md](./tooling.md).

> **Git Bash en Windows:** MSYS convierte `/gym` en una ruta de Windows (`C:/Program Files/Git/gym`) y el script lo rechaza. Correrlo con `MSYS_NO_PATHCONV=1 pnpm web:new-feature …` o desde PowerShell.

El script inserta los imports en orden alfabético y registra la ruta y el ítem de navbar sin depender de los vecinos actuales; si no encuentra dónde, falla con un mensaje en vez de dejar el registro a medias.

## 2. Estructura mínima

```
features/<name>/
  <name>.routes.tsx
  <name>.page.tsx
  <name>.nav.tsx          # si va al menú
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

1. Exportar ítem en `features/gym/gym.nav.tsx`
2. Agregar clave en `MAIN_NAV_ORDER` y mapeo en [`nav-registry.tsx`](../../apps/web/src/app/navigation/nav-registry.tsx)

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
