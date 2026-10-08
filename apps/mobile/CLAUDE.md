# Mobile — convenciones

UI con **Tamagui**, nunca Mantine. Nueva feature: `/new-feature`.

## Estructura

```
apps/mobile/
  app/                    # Expo Router
    _layout.tsx           # Tamagui + AuthProvider + AuthGate
    login.tsx
    (tabs)/index|media|profile.tsx
  src/
    core/auth/            # AuthProvider, SecureStore
    shared/api/           # API_KEYS, client Bearer, tokenStorage
    features/<name>/      # screen + hooks
    theme/tamagui.config.ts
```

- Imports: `@/shared/api`, `@/core/auth`, `@/features/...`, `@/theme/...`.
- **Prohibido:** feature A → feature B.
- Contratos desde `@omni/shared/*`; no duplicar schemas.

## API paths

Todos los endpoints en `src/shared/api/keys.ts` como `API_KEYS`.

```ts
import { api, API_KEYS } from '@/shared/api';
await api.get(API_KEYS.media.list);
```

Base URL: `EXPO_PUBLIC_API_URL` (sin slash final). **Prohibido:** literales `'/api/...'` fuera de `keys.ts`.

## Hooks (SWR)

```ts
import { api, API_KEYS, buildQueryString, fetcher } from '@/shared/api';
import useSWR from 'swr';
import useSWRImmutable from 'swr/immutable';
```

| Caso            | Hook                                                |
| --------------- | --------------------------------------------------- |
| Sesión / perfil | `useSWRImmutable` + key null si no hay token        |
| Listas / search | `useSWR`                                            |
| Mutations       | `api.post/patch/delete` + `mutate` / `globalMutate` |

Return: dominio + `isLoading` + `error` (+ `isMutating` si aplica). Paridad de patrones con web: skill `swr-hooks`.

## Auth

- **No cookies.** Tokens en `expo-secure-store` vía `tokenStorage`.
- Login/refresh devuelven `accessToken` + `refreshToken` en el body (`AuthTokensResponse`).
- Cada request: `Authorization: Bearer <access>` (`src/shared/api/client.ts`).
- 401 → refresh con `{ refreshToken }` → reintento; si falla, limpiar tokens. Lo maneja el client: no reimplementar en cada hook.
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
