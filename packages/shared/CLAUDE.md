# Shared contracts — `@omni/shared`

Zod schemas, tipos y lógica pura compartidos por `apps/api`, `apps/web` y `apps/mobile`.

## Estructura

Un subpath por dominio, declarado una sola vez en `package.json#exports` (no hay entrada raíz: ni `"."`, ni `main`, ni `typesVersions`, ni `src/index.ts`).

```
src/
  api/          capa de datos de web y mobile: ApiError, API_PATHS + buildQueryString (web los usa como SWR_KEYS, mobile como API_KEYS), getErrorMessage, isClientError, SWR_RETRY_OPTIONS y la fábrica `createApiClient({ fetch, toUrl?, credentials?, getAuthHeaders?, refresh, onAuthFailure? })` con request JSON, 401 → refresh single-flight → reintento (sin refrescar en login, logout y refresh; con `getAuthHeaders`, si cambiaron desde que salió el request reintenta sin rotar y `null` es sin sesión), parseo de errores (`toApiError`), 204 y `waitForRefresh(maxMs)`. `onAuthFailure` se avisa una vez por refresh que devuelve `false`; un refresh que lanza propaga su error. Cada cliente pone el transporte de sesión (cookies o Bearer) y el `fetchWithWake` de su instancia de server-wake. Tipos DOM con `/// <reference lib="dom" />` solo en `client.ts`.
  auth/         ROLES/Role, schemas (login, createUser, refresh body), `toSessionUser`, tipos de sesión
  users/        profile, password, preferences y `buildProfileUpdates`/`normalizeOptionalText` (diff del formulario de perfil)
  media/        MEDIA_TYPES, MEDIA_STATUSES, schemas de alta/edición/búsqueda/filtro (`MediaFilters`), tipos de TMDB, utils de TMDB (`resolveMediaType`, `buildMediaTmdbKey`, `getTmdbResultKey`, `getTmdbResultTitle`), `MEDIA_STATUS_OPTIONS`/`MEDIA_TYPE_OPTIONS` y el filtro de la lista en el cliente (`MediaListFilters`, `DEFAULT_MEDIA_FILTERS`, `filterMediaItems`, `hasActiveFilters`)
  gym/          planes y ejercicios: schemas, tipos, GYM_PLAN_STATUSES
  expenses/     gastos personales y recordatorios: categorías, recurrencias, schemas, tipos
  split-expenses/ amigos y juntadas: schemas, tipos, `computeBalances`/`computeSettlements`/`summarizeGatheringPayments`
  pantry/       alacena y lista de compras: categorías, unidades, schemas, `isLowStock`/`isExpiringSoon`
  holidays/     tipos de efemérides (Wikipedia), MAX_HOLIDAY_ITEMS y el carrusel (`HOLIDAY_CAROUSEL_DURATION_MS`, `HOLIDAY_STALE_DAY_RETRY_MS`, `nextCarouselIndex`, `clampCarouselIndex`, `isStaleHolidayDay`, `emptyTodayHolidays`)
  common/       paginación, cotas de entrada (limits), fechas en APP_TIMEZONE, `roundMoney`, `formatMoney`/`MONEY_FORMAT` (es-AR) y `getTimeGreeting`
  theme/        BRAND, SEMANTIC, GRAY, success/destructive, `contrastRatio` y `resolveColorScheme` (override > perfil > sistema) (web + mobile)
  navigation/   NAV_REGISTRY: labels, rutas y disponibilidad de módulos (navbar web, tabs y "Más" mobile)
  server-wake/  cold start de la API: constantes, funciones puras (backoff, `isApiResponse`, `isIdempotentMethod`) y la fábrica `createServerWake({ fetch, healthUrl, createError, probeInit?, isOffline? })` con la orquestación (single-flight, polling, tope, reintento); cada cliente crea su instancia y pone la UI del aviso. Sin conexión (`isOffline()` del cliente, o 2 sondeos seguidos que fallan por red, no por timeout, sin respuesta previa) el polling se corta y se relanza el error de red del request; el tope de 90 s incluye al último sondeo y un request abortado por el caller deja de esperar. Cada intento del request tiene tope hasta los headers: 30 s si es idempotente (`SERVER_REQUEST_TIMEOUT_MS`; al vencer cuenta como error de red: polling y reintento) y 100 s si no (`SERVER_MUTATION_TIMEOUT_MS`: más que el cold start de ~1 min, que retiene el request, y menos que los 120 s del proxy de Vercel; al vencer se propaga). El timeout lanza `createError(SERVER_TIMEOUT_MESSAGE, 0)`. Idempotente = GET/HEAD/PUT/DELETE o `fetchWithWake(url, init, { idempotent: true })` (el refresh: la API lo acepta repetido dentro de su gracia de rotación). Un 504 del proxy en un request no idempotente no se reintenta (la API pudo procesarlo) y lanza `createError(SERVER_GATEWAY_TIMEOUT_MESSAGE, 504)`; 502/503 sí, siempre, porque son el cold start. Los tipos DOM (`fetch`, `Response`) entran con `/// <reference lib="dom" />` solo en ese archivo.
```

Import por subpath: `import { addMediaItemSchema } from '@omni/shared/media'`. No confundir con `@/shared` (cliente HTTP de web/mobile). Un subpath nuevo se agrega a `exports` y a esta lista (y al README).

## Reglas

1. **Un schema, varios consumidores** — API con `validate(schema)` / `validate(schema, 'query')`; clientes con `schemaResolver` y tipos de respuesta.
2. **Labels de UI en español** pueden vivir acá (`MEDIA_STATUS_LABELS`) si son estables.
3. **Validación de un solo cliente** (ej. confirmar contraseña en web, los `*FormSchema`/`*FormValues` de un formulario): `.extend()` / `.refine()` en la feature de ese cliente, no acá.
4. **Cambio breaking** → actualizar API + clientes afectados + tests en el mismo PR.
5. **Auth dual:** login/refresh responden `AuthTokensResponse` (user + tokens). Web ignora los tokens (cookies); mobile los persiste.
6. **Colores de marca** solo en `src/theme/`. Web (Mantine) y mobile (Tamagui) mapean; nada de hex sueltos en features.
7. **Uniones literales derivadas de una constante:** `ROLES`, `MEDIA_TYPES`, … son `as const` y el tipo sale de ahí (`Role = (typeof ROLES)[number]`); no repetir el literal a mano.

## Tests

Vitest propio (`pnpm --filter @omni/shared test`). La lógica y los schemas de shared se testean acá, una sola vez; las apps solo prueban su cableado (por ejemplo, la instancia de `createServerWake` de cada cliente). Los tests van en `src/<dominio>/__tests__/*.test.ts`, importan el dominio por ruta relativa (`'..'`) y no usan `@omni/shared/...`.

## Orden de implementación

```
packages/shared  →  apps/api (routes/service)  →  apps/web y/o apps/mobile (keys, hooks, UI)
```
