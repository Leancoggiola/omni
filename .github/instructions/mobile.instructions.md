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

## Verificación

```bash
pnpm --filter mobile check-types && pnpm --filter mobile lint
```
