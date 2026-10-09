# Mobile — convenciones

UI con **Tamagui**, nunca Mantine. Nueva feature: `/new-feature`.

## Estructura

```
apps/mobile/
  app/                    # Expo Router
    _layout.tsx           # Tamagui + AuthProvider + Notifications/Confirm/ActionSheet + AuthGate (Stack)
    login.tsx
    profile.tsx           # ruta de stack sobre las tabs (se abre solo desde la tarjeta de usuario de "Más")
    (tabs)/index|media|pantry|more.tsx
  src/
    core/auth/            # AuthProvider, SecureStore
    shared/api/           # API_KEYS, client Bearer, tokenStorage
    shared/ui/            # primitivas de UI (ver abajo)
    shared/navigation/    # NAV_ICONS, NAV_HREFS, TAB_ROUTES y MORE_TAB (lo que depende de auth/router; shared/ui es presentacional)
    features/<name>/      # screen + hooks
    theme/                # tamagui.config, fonts, elevation, gradient
```

- Imports: `@/shared/api`, `@/shared/ui`, `@/core/auth`, `@/features/...`, `@/theme/...`.
- **Prohibido:** feature A → feature B.
- Contratos desde `@omni/shared/*`; no duplicar schemas.

## Navegación

- Tabs **Inicio · Media · Alacena · Más**, sin header de React Navigation: cada pantalla arranca con `Screen` + `ScreenHeader`. Perfil (`/profile`, ruta de stack) se abre **solo desde Más**: los headers de las tabs no llevan avatar.
- Labels, rutas y disponibilidad salen de `NAV_REGISTRY` de `@omni/shared/navigation` (el mismo que usa el navbar de web); los íconos, de `NAV_ICONS`. Tabs: `MOBILE_TAB_KEYS`.
- "Más" es el launcher: tarjeta de usuario → Perfil, toggle de tema, módulos (los que no tienen `"mobile"` en `availableOn` salen como "Próximamente"), Administración si el rol es ADMIN y cerrar sesión.
- Módulo nuevo en mobile: sumar `"mobile"` a su `availableOn`, crear la ruta en `app/` con el mismo `path` y registrarla en `NAV_HREFS` (`src/shared/navigation/navHrefs.ts`, tipada con `typedRoutes`).

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

| Pieza                                                            | Uso                                                                                                                                                                               |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Screen`                                                         | Contenedor de pantalla: fondo, márgenes e inset de la status bar (`insetTop={false}` bajo un header de stack)                                                                     |
| `UserAvatar`                                                     | Avatar con gradiente de marca e iniciales (= `UserAvatar` de web)                                                                                                                 |
| `ScreenHeader`                                                   | Cabecera de pantalla: chip terracota + título + subtítulo + `actions` (= `PageHeader`)                                                                                            |
| `SectionCard`                                                    | Superficie de contenido, `title`/`subtitle` opcionales (= `Paper` / `ProfileSectionCard`)                                                                                         |
| `Title`                                                          | Títulos con la escala `HEADING` (= `Title order`)                                                                                                                                 |
| `LoadingState` / `EmptyState` / `ErrorState`                     | Estados de UI (regla de oro 0)                                                                                                                                                    |
| `StatusPill`                                                     | Estado de media: neutro / terracota / sage; con `onPress` abre un selector                                                                                                        |
| `notifySuccess` / `notifyError` / `notifyWarning` / `notifyInfo` | Feedback de acciones. **Nunca `Alert.alert`**                                                                                                                                     |
| `confirm({ title, description, … })`                             | Confirmación en bottom sheet; devuelve `Promise<boolean>`                                                                                                                         |
| `actionSheet({ title, options, value })`                         | Elegir una opción en bottom sheet (check en la actual + "Cancelar"); resuelve el `value` o `null`. Nunca `Alert.alert` con opciones                                               |
| `Button` / `IconButton`                                          | = `Button` / `ActionIcon`: `variant` filled · outline · light · subtle, `color`, `size` sm 36 / md 44 / lg 50, `leftSection`/`icon` (componente Phosphor), `loading`, `fullWidth` |
| `TextField` / `PasswordField`                                    | = `TextInput` / `PasswordInput`: `label`, `description`, `error`, `required`, `leftSection`, `disabled`, `ref` para encadenar foco                                                |
| `Select`                                                         | = `Select` de Mantine: campo de 44 dp con el valor y el caret; las opciones abren un `actionSheet()`                                                                              |
| `Switch`                                                         | Switch de marca; con `label`/`description` arma la fila                                                                                                                           |
| `SegmentedControl` / `Chip`                                      | Selección: segmento activo en marca (= `SegmentedControl size="sm" color="brand.6"`) / chip de filtro                                                                             |
| `Badge` / `Banner`                                               | Indicadores: pill en mayúsculas (`accent` filled = tipo de media) / `Alert` light-custom (`color="destructive"` para errores de formulario)                                       |
| `Spinner`                                                        | Color de marca por defecto (`color="$color"` dentro de un botón filled). ESLint prohíbe el de `tamagui`                                                                           |

- Medidas: `RADIUS` / `SPACING` / `FONT_SIZE` de `@omni/shared/theme` como números (`padding={SPACING.md}`); sombras con `elevation('sm')` de `@/theme/elevation`. No usar tokens `$4` de Tamagui como medida (`padding="$4"`, `gap="$2"`, `borderRadius="$4"`) en código nuevo (ver `docs/design-system.md`). La prop `size` de los componentes de Tamagui (`<Button size="$4">`, `Spinner`) es otra cosa: elige una variante del componente (alto, padding y fuente juntos) y se sigue usando.
- Colores: tokens de tema (`$accentSurface`, `$destructive`, …) en props de Tamagui; para valores crudos (íconos Phosphor, gradientes), `useSemanticColors()` de `@/core/theme`.
- Código nuevo usa las primitivas, no `Button`/`Input`/`Switch` de Tamagui directo (Perfil todavía los usa y se migra en #69).
- Un formulario en bottom sheet que tiene que tapar las tabs (p. ej. `AddMediaSheet`) va dentro de un `Modal` de RN con el `Sheet` sin `modal`: el portal de Tamagui (`<Sheet modal>`) crashea en Fabric con "The specified child already has a parent". Tamagui no llama a `onAnimationComplete` al cerrar, así que el `Modal` se oculta con un tiempo fijo; mientras está visible tapa los toasts, por eso el error va en un `Banner` adentro y el éxito se avisa al cerrar.

## Botones de acción

A diferencia de web (alineados a la derecha), en mobile van **centrados y full-width**, apilados verticalmente cuando hay más de uno — así se maximiza el área de toque. El `Button` de `@/shared/ui` ocupa solo su contenido, como en Mantine: el ancho completo se pide con `fullWidth`. Sin `fullWidth`, `Button`, `Badge` y `Chip` se alinean al inicio (`alignSelf="flex-start"`); en una fila centrada se pasa `alignSelf="center"`.

- Un solo botón (guardar, actualizar) → `<Button fullWidth>`. El texto va como `children` (string) y la carga con `loading`, nunca un `Spinner` adentro.
- Confirmar + cancelar: **confirmar arriba** (filled), **cancelar abajo** (`variant="outline"`). `confirm()` de `@/shared/ui` ya lo hace así.
- Acciones destructivas standalone (ej. "Eliminar cuenta") siguen siendo filled (`color="destructive"`), igual que en web.
- `ProfileScreen` todavía usa `Alert.alert`: se migra a `notify*` / `confirm` en #69.

## Tests

- `jest-expo` + `@testing-library/react-native`. Archivos `*.test.ts(x)` al lado del código, nunca dentro de `app/` (Expo Router los tomaría como rutas).
- Lógica pura (reducers de cola, helpers de tema) se testea sin renderizar. Para primitivas y providers, mockear `tamagui` con el doble compartido y probar el comportamiento (role, label, estado, callbacks), no el componente de Tamagui:

  ```ts
  jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
  jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
  ```

  Los Stacks interactivos llevan `accessible` (si no, ni TalkBack ni `getByRole` los encuentran cuando están deshabilitados).

- Tests de una pantalla que mockean `tamagui`: si falla con `Cannot read properties of undefined (reading 'get')`, el compilador de Tamagui aplanó un Stack estático de esa pantalla. Se evita con `// tamagui-ignore` como **primera línea** del archivo (como `LoginScreen.tsx`).
- Si un paquete de `node_modules` publica ESM sin build CommonJS, sumarlo a `transformIgnorePatterns` en `jest.config.js`.

## Verificación

```bash
pnpm --filter mobile check-types && pnpm --filter mobile lint && pnpm --filter mobile test
```
