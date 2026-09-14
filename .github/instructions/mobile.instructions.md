---
description: 'Convenciones de apps/mobile (Expo Router + Tamagui): estructura de features, API_KEYS y auth con Bearer + SecureStore.'
applyTo: 'apps/mobile/**'
---

# Mobile — convenciones

Referencias completas: skills `mobile-structure`, `mobile-data-hooks` (`.github/skills/`).

## Estructura

| Capa              | Uso                                  |
| ----------------- | ------------------------------------ |
| `app/`            | Expo Router (rutas, tabs, login)     |
| `src/features/`   | Dominio (auth, home, media, profile) |
| `src/shared/api/` | `API_KEYS`, client Bearer            |
| `src/core/auth/`  | AuthProvider, SecureStore            |
| `src/theme/`      | Tamagui config                       |

- Imports: `@/shared/api`, `@/core/auth`, `@/features/...`, `@/theme/...`.
- **Prohibido:** feature A → feature B.
- Contratos desde `@omni/shared/*`; no duplicar schemas.
- UI con **Tamagui**, no Mantine.

## API paths

Todos los endpoints en `apps/mobile/src/shared/api/keys.ts` como `API_KEYS`.

```ts
import { api, API_KEYS } from '@/shared/api';
await api.get(API_KEYS.media.list);
```

Base URL: `EXPO_PUBLIC_API_URL` (sin slash final). **Prohibido:** literales `'/api/...'` fuera de `keys.ts`.

## Auth

- **No cookies.** Tokens en `expo-secure-store` vía `tokenStorage`.
- Login/refresh devuelven `accessToken` + `refreshToken` en el body (`AuthTokensResponse`).
- Cada request: `Authorization: Bearer <access>` (`src/shared/api/client.ts`).
- 401 → refresh con `{ refreshToken }` → reintento; si falla, limpiar tokens.
- Logout: POST con body `{ refreshToken }` + clear SecureStore.
- Web usa cookies; no mezclar estrategias en el mismo client.

## Botones de acción

A diferencia de web (alineados a la derecha), en mobile van **centrados y full-width**, apilados verticalmente cuando hay más de uno — así se maximiza el área de toque. `YStack` ya estira los hijos a lo ancho por defecto (`alignItems: stretch`); no hay que forzar nada extra.

- Un solo botón (guardar, actualizar) → `Button` full-width tal cual.
- Confirmar + cancelar (cuando se arme un diálogo propio, no el `Alert.alert` nativo): **confirmar arriba** (filled), **cancelar abajo** (`variant="outlined"`).
- Acciones destructivas standalone (ej. "Eliminar cuenta") siguen siendo filled (`theme="red"`), igual que en web.
- Hoy las confirmaciones (`ProfileScreen`, `MediaScreen`) usan `Alert.alert` nativo — no se puede re-estilar, esta regla aplica cuando se construya un diálogo propio en Tamagui.

## Verificación

```bash
pnpm --filter mobile check-types && pnpm --filter mobile lint
```
