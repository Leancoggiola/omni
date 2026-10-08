# Mobile — convenciones

UI con **Tamagui**, nunca Mantine. Nueva feature: `/new-feature`.

## Estructura

```
apps/mobile/
  app/                    # Expo Router
    _layout.tsx           # Tamagui + AuthProvider + Notifications/Confirm + AuthGate
    login.tsx
    (tabs)/index|media|profile.tsx
  src/
    core/auth/            # AuthProvider, SecureStore
    shared/api/           # API_KEYS, client Bearer, tokenStorage
    shared/ui/            # primitivas de UI (ver abajo)
    features/<name>/      # screen + hooks
    theme/                # tamagui.config, fonts, elevation, gradient
```

- Imports: `@/shared/api`, `@/shared/ui`, `@/core/auth`, `@/features/...`, `@/theme/...`.
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

## UI compartida (`@/shared/ui`)

Misma API que `@/shared/ui` de web. Las features no arman estas piezas a mano:

| Pieza                                                            | Uso                                                                                       |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `ScreenHeader`                                                   | Cabecera de pantalla: chip terracota + título + subtítulo + `actions` (= `PageHeader`)    |
| `SectionCard`                                                    | Superficie de contenido, `title`/`subtitle` opcionales (= `Paper` / `ProfileSectionCard`) |
| `Title`                                                          | Títulos con la escala `HEADING` (= `Title order`)                                         |
| `LoadingState` / `EmptyState` / `ErrorState`                     | Estados de UI (regla de oro 0)                                                            |
| `StatusPill`                                                     | Estado de media: neutro / terracota / sage; con `onPress` abre un selector                |
| `notifySuccess` / `notifyError` / `notifyWarning` / `notifyInfo` | Feedback de acciones. **Nunca `Alert.alert`**                                             |
| `confirm({ title, description, … })`                             | Confirmación en bottom sheet; devuelve `Promise<boolean>`                                 |

- Medidas: `RADIUS` / `SPACING` / `FONT_SIZE` de `@omni/shared/theme` como números (`padding={SPACING.md}`); sombras con `elevation('sm')` de `@/theme/elevation`. No usar los `$4` de Tamagui en código nuevo (ver `docs/design-system.md`).
- Colores: tokens de tema (`$accentSurface`, `$destructive`, …) en props de Tamagui; para valores crudos (íconos Phosphor, gradientes), `useSemanticColors()` de `@/core/theme`.

## Botones de acción

A diferencia de web (alineados a la derecha), en mobile van **centrados y full-width**, apilados verticalmente cuando hay más de uno — así se maximiza el área de toque. `YStack` ya estira los hijos a lo ancho por defecto (`alignItems: stretch`); no hay que forzar nada extra.

- Un solo botón (guardar, actualizar) → `Button` full-width tal cual.
- Confirmar + cancelar: **confirmar arriba** (filled), **cancelar abajo** (`variant="outlined"`). `confirm()` de `@/shared/ui` ya lo hace así.
- Acciones destructivas standalone (ej. "Eliminar cuenta") siguen siendo filled (`theme="red"`), igual que en web.
- `LoginScreen`, `MediaScreen` y `ProfileScreen` todavía usan `Alert.alert`: se migran a `notify*` / `confirm` en #67, #68 y #69.

## Tests

- `jest-expo` + `@testing-library/react-native`. Archivos `*.test.ts(x)` al lado del código, nunca dentro de `app/` (Expo Router los tomaría como rutas).
- Lógica pura (reducers de cola, helpers de tema) se testea sin renderizar. Para providers, mockear `tamagui` con dobles mínimos y probar el comportamiento, no el componente de Tamagui (ver `src/shared/ui/confirm/ConfirmProvider.test.tsx`).
- Si un paquete de `node_modules` publica ESM sin build CommonJS, sumarlo a `transformIgnorePatterns` en `jest.config.js`.

## Verificación

```bash
pnpm --filter mobile check-types && pnpm --filter mobile lint && pnpm --filter mobile test
```
