# Shared contracts — `@omni/shared`

Zod schemas y tipos compartidos por `apps/api`, `apps/web` y `apps/mobile`.

## Estructura

```
src/
  auth/       schemas + types (login, session, createUser)
  media/      MEDIA_TYPES, MEDIA_STATUSES, add/update/search schemas
  users/      profile, password, preferences
  theme/      BRAND, SEMANTIC, GRAY, success/destructive (web + mobile)
  index.ts    re-exports
```

Import por subpath: `import { addMediaItemSchema } from '@omni/shared/media'`. No confundir con `@/shared` (cliente HTTP de web/mobile).

## Reglas

1. **Un schema, varios consumidores** — API con `validate(schema)` / `validate(schema, 'query')`; clientes con `schemaResolver` y tipos de respuesta.
2. **Labels de UI en español** pueden vivir acá (`MEDIA_STATUS_LABELS`) si son estables.
3. **Validación de un solo cliente** (ej. confirmar contraseña en web): `.extend()` / `.refine()` en ese feature, no acá.
4. **Cambio breaking** → actualizar API + clientes afectados + tests en el mismo PR.
5. **Auth dual:** login/refresh responden `AuthTokensResponse` (user + tokens). Web ignora los tokens (cookies); mobile los persiste.
6. **Colores de marca** solo en `src/theme/`. Web (Mantine) y mobile (Tamagui) mapean; nada de hex sueltos en features.

## Orden de implementación

```
packages/shared  →  apps/api (routes/service)  →  apps/web y/o apps/mobile (keys, hooks, UI)
```
