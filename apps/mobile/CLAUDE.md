# Mobile — convenciones

UI con **Tamagui**, nunca Mantine. Nueva feature: `/new-feature`.

## Estructura

```
apps/mobile/
  app/                    # Expo Router
    _layout.tsx           # Tamagui + SWRProvider + AuthProvider + Notifications/Confirm/ActionSheet + AuthGate (Stack)
    login.tsx
    profile.tsx           # ruta de stack sobre las tabs (se abre solo desde la tarjeta de usuario de "Más")
    (tabs)/index|media|pantry|more.tsx
  src/
    core/auth/            # AuthProvider (sesión; los tokens se leen y escriben vía `@/shared/api`, módulo `tokenStorage`)
    core/authGate/        # AuthGate: spinner, login, ErrorState de sesión sin verificar o el Stack
    core/providers/       # SWRProvider (caché, reintentos, foco con AppState)
    core/serverWake/      # ServerWakeNotice (aviso de cold start)
    shared/api/           # API_KEYS, client Bearer, tokenStorage
    shared/ui/            # primitivas de UI (ver abajo)
    shared/navigation/    # NAV_ICONS, NAV_HREFS, TAB_ROUTES y MORE_TAB (lo que depende de auth/router; shared/ui es presentacional)
    features/<name>/      # screen + hooks
    theme/                # tamagui.config, fonts, elevation, gradient
```

- Imports: `@/shared/api`, `@/shared/ui`, `@/core/auth`, `@/features/...`, `@/theme/...`.
- **Prohibido:** feature A → feature B.
- Contratos desde `@omni/shared/*`; no duplicar schemas.
- **React Compiler activo** en mobile (`experiments.reactCompiler: true` en `app.json`). Web no lo tiene activado.
- **Tokens:** SecureStore vive en `src/shared/api/tokenStorage.ts` (una sola clave con access y refresh). Solo ese módulo habla con `expo-secure-store`.

## Navegación

- Tabs **Inicio · Media · Alacena · Más**, sin header de React Navigation: cada pantalla arranca con `Screen` + `ScreenHeader` (Inicio es la excepción: una sola card con el saludo, como web). Perfil (`/profile`, ruta de stack, también sin header nativo) se abre **solo desde Más** y su `ScreenHeader` lleva el botón de volver (`onBack`): los headers de las tabs no llevan avatar.
- Labels, rutas y disponibilidad salen de `NAV_REGISTRY` de `@omni/shared/navigation` (el mismo que usa el navbar de web); los íconos, de `NAV_ICONS`. Tabs: `MOBILE_TAB_KEYS`.
- "Más" es el launcher: tarjeta de usuario → Perfil, toggle de tema (override de la sesión), módulos (los que no tienen `"mobile"` en `availableOn` salen con el `Badge` "Próximamente"), Administración si el rol es ADMIN y cerrar sesión (que solo está acá, no en Perfil).
- Módulo nuevo en mobile: sumar `"mobile"` a su `availableOn`, crear la ruta en `app/` con el mismo `path` y registrarla en `NAV_HREFS` (`src/shared/navigation/navHrefs.ts`, tipada con `typedRoutes`).

## API paths

Todos los endpoints en `API_PATHS` de `@omni/shared/api` (el mismo mapa que web); `src/shared/api/keys.ts` lo re-exporta como `API_KEYS`.

```ts
import { api, API_KEYS } from '@/shared/api';
await api.get(API_KEYS.media.list);
```

Base URL: `EXPO_PUBLIC_API_URL` (sin slash final). **Prohibido:** literales `'/api/...'` fuera de ese mapa. Verificación: `pnpm --filter mobile check-api-paths`.

El núcleo HTTP (request, 401 → refresh single-flight → reintento, parseo de errores y 204) es `createApiClient` de `@omni/shared/api`. `src/shared/api/client.ts` es el adaptador: `getAuthHeaders` con el Bearer de `tokenStorage`, el refresh con `{ refreshToken }` y `logoutSession` (que espera al refresh con `waitForRefresh`).

## Cold start de la API

Igual que web: el client usa `fetchWithWake` (`shared/api/serverWake.ts`) en `request` y en el refresh, con `API_KEYS.health`. Reintenta si la respuesta es del proxy o de la plataforma (no es JSON y trae 502/503/504 o `text/html`: cualquier método; un JSON, aunque sea 502, se devuelve tal cual) o si `fetch` lanza un error de red solo en GET/HEAD/PUT/DELETE; en POST/PATCH el error se propaga porque no se sabe si la API procesó el request. Un 504 del proxy en POST/PATCH tampoco se reintenta (lanza `ApiError` 504). Cada intento tiene tope hasta los headers (OkHttp de RN no tiene timeout): 30 s si es idempotente, 100 s en POST/PATCH (esperan el cold start); al vencer, `ApiError` con status 0. El refresh se pide con `{ idempotent: true }` (la API acepta el mismo token dentro de su gracia de rotación): corta a los 30 s y se reintenta, así un refresh colgado no bloquea los requests que lo esperan. Sin conexión no espera 90 s: tras 2 sondeos seguidos al health con error de red (no por su timeout) y sin ninguna respuesta HTTP previa, corta, sin banner, y relanza el error de red del request (no hay NetInfo: no se consulta el estado de red del dispositivo); una respuesta del proxy (502/503/504, HTML) o un timeout del sondeo siguen el polling. Además, `ServerWakeNotice` (`core/serverWake`, montado en `app/_layout.tsx`) muestra un `Banner` mientras la API despierta (aparece cuando falla el primer sondeo o pasan ~1,5 s sin respuesta). `serverWake.ts` es una instancia de `createServerWake` de `@omni/shared/server-wake`, que tiene la orquestación compartida con web, las constantes y la decisión pura.

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

`SWRProvider` (`core/providers`, por encima de `AuthProvider`: la sesión y los datos comparten caché) usa una caché a nivel de módulo, porque expo-router vuelve a montar el layout raíz al redirigir (login → tabs) y una creada al montar se perdería; pone el `fetcher`, los reintentos (`SWR_RETRY_OPTIONS` de `@omni/shared/api`, igual que web: 3, sin reintentar 4xx salvo 408 y 429) y `initFocus` con `AppState`: los `useSWR` revalidan al volver a primer plano, los `useSWRImmutable` no. Sin NetInfo no hay `initReconnect`. Las listas y el perfil llevan "tirar para actualizar" con `usePullToRefresh(refresh)` de `@/shared/ui` (`refreshControl`).

## Auth

- **No cookies.** Tokens en `expo-secure-store` vía `tokenStorage`, en **una sola clave** (`omni.session`, JSON con access y refresh): `setTokens` los escribe juntos o no escribe nada. `tokenStorage` migra una vez por proceso las claves anteriores (`omni.accessToken` / `omni.refreshToken`) sin cerrar la sesión; los tests de `tokenStorage` cubren que sea idempotente. Los tokens se leen siempre por `tokenStorage`, nunca con `SecureStore` directo. El par de JWT ronda los 600 bytes (la API firma `sub`, `username` y `role` en el access, y `sub` y `jti` en el refresh): si se suman claims o se soporta iOS, `expo-secure-store` avisa a partir de ~2048 bytes por valor.
- Login/refresh devuelven `accessToken` + `refreshToken` en el body (`AuthTokensResponse`).
- Cada request: `Authorization: Bearer <access>` (`src/shared/api/client.ts`).
- 401 → refresh con `{ refreshToken }` → reintento. Lo maneja el client: no reimplementar en cada hook. Un solo refresh a la vez; si el access ya cambió cuando llega el 401 (otro request refrescó antes), reintenta sin rotar de nuevo.
- Solo un **401/403 del refresh** limpia los tokens y avisa (`setOnAuthFailure` → `AuthProvider.clearSession`). Un 5xx, un 429 o un error de red propagan el error y conservan la sesión: el `ApiError` que llega al hook es el del refresh, no el 401 original. Si la sesión cambió mientras el refresh volaba (logout, login nuevo), su resultado se descarta. Los hooks de datos reintentan un 429 y no los demás 4xx.
- Logout: `logoutSession()` del client espera un refresh en curso (hasta 3 s), lee el refresh token vigente al enviar y hace `POST` con `{ refreshToken }` sin pasar por el refresh por 401 (la API no responde 401 al logout); sin refresh token guardado no hace ningún request. `AuthProvider.logout` limpia tokens y caché de SWR aunque falle el POST, y al POST lo espera hasta 8 s (con la API colgada no espera su tope de 100 s); si falla el borrado en SecureStore, la UI igual sale de la sesión y el error se relanza para que quien llama avise (`MoreScreen` y `ProfileScreen` ya lo hacen).
- Al arrancar con token, si `/auth/profile` falla por red, timeout, 5xx, 408 o 429 (`isSessionUnverified`), `AuthGate` muestra un `ErrorState` con "Reintentar" (`retrySession`) y "Cerrar sesión" en vez de mandar al login: la sesión puede seguir siendo válida. Un 4xx que no sea 408 ni 429 sí manda al login. El hook de sesión recibe `SWR_RETRY_OPTIONS` directamente. `login()` cachea la sesión con `globalMutate` antes de activar la key, así no pide el perfil de nuevo.
- Errores al usuario: `getErrorMessage(err, fallback)` (de `@omni/shared/api`, re-exportado por `@/shared/ui`) muestra `err.message` solo si es `ApiError` (ya en español); un error de red o de parseo usa el fallback.
- Web usa cookies; no mezclar estrategias en el mismo client.

## UI compartida (`@/shared/ui`)

Misma API que `@/shared/ui` de web. Las features no arman estas piezas a mano:

| Pieza                                             | Uso                                                                                                                                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Screen`                                          | Contenedor de pantalla: fondo, márgenes e inset de la status bar (ninguna ruta tiene header nativo); `insetBottom` en rutas de stack sin tab bar                                  |
| `UserAvatar`                                      | Avatar con gradiente de marca e iniciales (= `UserAvatar` de web)                                                                                                                 |
| `ScreenHeader`                                    | Cabecera de pantalla: chip terracota + título + subtítulo (= `PageHeader`); `onBack` suma el `IconButton` de volver (rutas de stack)                                              |
| `SectionCard`                                     | Superficie de contenido, `title`/`subtitle` opcionales (= `Paper` / `ProfileSectionCard`)                                                                                         |
| `Title`                                           | Títulos con la escala `HEADING` (= `Title order`)                                                                                                                                 |
| `LoadingState` / `EmptyState` / `ErrorState`      | Estados de UI (regla de oro 0)                                                                                                                                                    |
| `StatusPill`                                      | Estado de media: neutro / terracota / sage; con `onPress` abre un selector                                                                                                        |
| `notifySuccess` / `notifyError` / `notifyWarning` | Feedback de acciones. **Nunca `Alert.alert`**                                                                                                                                     |
| `confirm({ title, description, … })`              | Confirmación en bottom sheet; devuelve `Promise<boolean>`                                                                                                                         |
| `actionSheet({ title, options, value })`          | Elegir una opción en bottom sheet (check en la actual + "Cancelar"); resuelve el `value` o `null`. Nunca `Alert.alert` con opciones                                               |
| `Button` / `IconButton`                           | = `Button` / `ActionIcon`: `variant` filled · outline · light · subtle, `color`, `size` sm 36 / md 44 / lg 50, `leftSection`/`icon` (componente Phosphor), `loading`, `fullWidth` |
| `TextField` / `PasswordField`                     | = `TextInput` / `PasswordInput`: `label`, `description`, `error`, `required`, `leftSection`, `disabled`, `ref` para encadenar foco                                                |
| `Select`                                          | = `Select` de Mantine: campo de 44 dp con el valor y el caret; las opciones abren un `actionSheet()`                                                                              |
| `Switch`                                          | Switch de marca; con `label`/`description` arma la fila                                                                                                                           |
| `SegmentedControl`                                | Selección: segmento activo en marca (= `SegmentedControl size="sm" color="brand.6"`)                                                                                              |
| `Badge` / `Banner`                                | Indicadores: pill en mayúsculas (`accent` filled = tipo de media) / `Alert` light-custom (`color="destructive"` para errores de formulario)                                       |
| `Spinner`                                         | Color de marca por defecto (`color="$color"` dentro de un botón filled). ESLint prohíbe el de `tamagui`                                                                           |

- Medidas: `RADIUS` / `SPACING` / `FONT_SIZE` de `@omni/shared/theme` como números (`padding={SPACING.md}`); sombras con `elevation('sm')` de `@/theme/elevation`. No usar tokens `$4` de Tamagui como medida (`padding="$4"`, `gap="$2"`, `borderRadius="$4"`) en código nuevo (ver `docs/design-system.md`). La prop `size` de los componentes de Tamagui (`<Button size="$4">`, `Spinner`) es otra cosa: elige una variante del componente (alto, padding y fuente juntos) y se sigue usando.
- Colores: tokens de tema (`$accentSurface`, `$destructive`, …) en props de Tamagui; para valores crudos (íconos Phosphor, gradientes), `useSemanticColors()` de `@/core/theme`.
- Las features usan las primitivas: ESLint (`eslint.config.mjs`, con test en `eslint.config.test.js`) prohíbe importar `Button`, `Input` y `Switch` de `tamagui` en `src/features` y `app`, `Spinner` y `Alert.alert` en cualquier archivo, un feature que importe otro y los hex o colores nombrados fuera de tests. Feedback: `notify*`; confirmar: `confirm()`; elegir: `actionSheet()`.
- Un formulario en bottom sheet que tiene que tapar las tabs (p. ej. `AddMediaSheet`) va dentro de un `Modal` de RN con el `Sheet` sin `modal`: el portal de Tamagui (`<Sheet modal>`) crashea en Fabric con "The specified child already has a parent". Tamagui no llama a `onAnimationComplete` al cerrar, así que el `Modal` se oculta con un tiempo fijo; mientras está visible tapa los toasts, por eso el error va en un `Banner` adentro y el éxito se avisa al cerrar.

## Botones de acción

A diferencia de web (alineados a la derecha), en mobile van **centrados y full-width**, apilados verticalmente cuando hay más de uno — así se maximiza el área de toque. El `Button` de `@/shared/ui` ocupa solo su contenido, como en Mantine: el ancho completo se pide con `fullWidth`. Sin `fullWidth`, `Button` y `Badge` se alinean al inicio (`alignSelf="flex-start"`); en una fila centrada se pasa `alignSelf="center"`.

- Un solo botón (guardar, actualizar) → `<Button fullWidth>`. El texto va como `children` (string) y la carga con `loading`, nunca un `Spinner` adentro.
- Confirmar + cancelar: **confirmar arriba** (filled), **cancelar abajo** (`variant="outline"`). `confirm()` de `@/shared/ui` ya lo hace así.
- Acciones destructivas standalone (ej. "Eliminar cuenta") siguen siendo filled (`color="destructive"`), igual que en web.
- **Deshabilitado hasta que haya cambios:** un botón de guardar de formulario (`Guardar cambios`, `Cambiar contraseña`) va `disabled` mientras no haya nada que enviar (campo distinto del guardado, o algo escrito). Las validaciones corren al enviar, con el error debajo de cada campo.
- **Preferencias que guardan al instante** (Switch, `SegmentedControl` de Tema en Perfil): muestran el valor nuevo enseguida, ignoran un segundo cambio de la misma preferencia mientras hay un PATCH en vuelo y, si falla, vuelven al valor anterior con `notifyError`. No llevan botón.

## Tests

- `jest-expo` + `@testing-library/react-native`. Archivos `*.test.ts(x)` al lado del código, nunca dentro de `app/` (Expo Router los tomaría como rutas).
- Lógica pura (reducers de cola, helpers de tema) se testea sin renderizar. Para primitivas y providers, mockear `tamagui` con el doble compartido y probar el comportamiento (role, label, estado, callbacks), no el componente de Tamagui:

  ```ts
  jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
  jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
  ```

  Los Stacks interactivos llevan `accessible` (si no, ni TalkBack ni `getByRole` los encuentran cuando están deshabilitados).

- Tests de una pantalla que mockean `tamagui`: si falla con `Cannot read properties of undefined (reading 'get')`, el compilador de Tamagui aplanó un Stack estático de esa pantalla. Se evita con `// tamagui-ignore` como **primera línea** del archivo (como `LoginScreen.tsx`). El compilador corre en el dev, en Jest y en el build de release; su consumo de memoria y cómo probar el bundle de producción están en `docs/mobile/tooling.md`.
- Tests que tocan tokens (`tokenStorage`, client, `AuthProvider`): `jest.mock('expo-secure-store', () => jest.requireActual('@/test/secureStoreMock'))` (store en memoria; `store` para sembrar y verificar claves) y `global.fetch` mockeado. `tokenStorage` y el client guardan estado de módulo: en tests que lo necesiten, `jest.resetModules()` + `require`.
- Si un paquete de `node_modules` publica ESM sin build CommonJS, sumarlo a `transformIgnorePatterns` en `jest.config.js`.

## Verificación

```bash
pnpm --filter mobile check-types && pnpm --filter mobile lint && pnpm --filter mobile check-api-paths && pnpm --filter mobile test
```
