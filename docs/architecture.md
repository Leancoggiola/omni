# Architecture

Monorepo con **pnpm workspaces** y **Turborepo**. Ambas apps siguen la misma convención de estructura de carpetas para facilitar el onboarding.

**Agentes:** [CLAUDE.md](../CLAUDE.md) · [web/tooling.md](./web/tooling.md).

---

## Estructura del monorepo

```
omni/
  apps/
    api/        ← Express API (Node.js + TypeScript)
    web/        ← React SPA (Vite + TypeScript)
    mobile/     ← Expo Android (Router + Tamagui)
  packages/
    shared/     ← Tipos y schemas compartidos (@omni/shared)
    eslint-config/
    typescript-config/
  docs/         ← Esta carpeta
  CLAUDE.md       ← Contexto raíz para Claude Code (+ un CLAUDE.md por app)
  .claude/        ← Subagents, commands, skills (propias y de terceros), hooks, permisos
  .mcp.json       ← MCP del proyecto (Supabase, CodeGraph, Mantine, Playwright)
  .codegraph/     ← Índice CodeGraph (local, no commitear *.db)
```

---

## `apps/api/src/`

```
src/
  common/                 ← Utilidades transversales
    db/
      prisma.ts           ← PrismaClient singleton
      session-lock.ts     ← lockUserSessions (advisory lock de sesiones)
      check-database.ts
      index.ts
    utils/
      logger.ts           ← Pino logger
      http-logger.ts      ← pino-http con redact de credenciales
      error-handler.ts    ← Express error handler middleware
      validate.ts         ← Zod validation middleware
      rate-limit.ts       ← createRateLimiter (apagable con RATE_LIMIT_DISABLED)
      client-ip.ts · origin-guard.ts · no-store.ts · not-found.ts
      cookies.ts          ← set/clear de la sesión
      lifestyle.ts
      index.ts
    index.ts              ← Barril: re-exporta db + utils
  health/                 ← /api/health y /api/health/ready (antes del guard)
  auth/                   ← Routes + service (+ middleware/, strategies/)
  media/ · users/ · admin/ · pantry/ · gym/ · expenses/ · split-expenses/ · holidays/
                          ← Mismo patrón routes + service
  generated/
    prisma/               ← Cliente Prisma generado (no editar)
  config.ts               ← Variables de entorno validadas
  app.ts                  ← createApp(): stack de middlewares de Express
  main.ts                 ← Bootstrap: conecta la base y escucha
  router.ts               ← Router principal
  __tests__/              ← Tests unitarios (schemas, utils, reglas)
    integration/          ← *.integration.test.ts (Supertest + Postgres real)
  test/                   ← Helpers de integración (createIntegrationApp, factories, resetTestDb…) y setupEnv.ts
```

### Convenciones API

| Carpeta/archivo  | Convención                                                     |
| ---------------- | -------------------------------------------------------------- |
| Cada feature     | `feature.routes.ts` + `feature.service.ts`                     |
| Imports de DB    | `import { prisma } from "../common/db"`                        |
| Imports de utils | `import { validate, logger } from "../common/utils"`           |
| Naming           | `camelCase` para funciones, `PascalCase` para interfaces/types |

Detalle de la estructura y convenciones: [apps/api/CLAUDE.md](../apps/api/CLAUDE.md). Checklist para agregar una feature: `/new-feature`.

---

## `apps/web/src/`

```
src/
  app/
    router.tsx
    routes.ts
    navigation/
      nav-registry.tsx
  features/               ← Dominio de producto (1 navbar item = 1 feature)
    home/ · auth/ · media/ · profile/ · admin/ · split-expenses/
  shared/
    api/                  ← client, fetcher, SWR_KEYS
    ui/                   ← componentes cross-feature (UserAvatar, …)
  core/
    auth/
    guards/
    providers/
  layouts/
    RootLayout.tsx
    AuthLayout.tsx
    components/           ← Navbar, Header, …
  theme/
  assets/
  main.tsx
```

### Estructura de features (web y mobile)

Una sola convención para los dos clientes. Web:

```
features/<name>/
  <page>.page.tsx           punto de entrada (en general <page> = <name>; auth → login.page.tsx)
  <name>.routes.tsx
  index.ts                  único barrel: exporta la ruta (lo que importa app/routes.ts)
  types.ts                  opcional
  components/
    Componente.tsx
    Compuesto/              carpeta solo si tiene auxiliares (subcomponentes, .module.scss), sin index.ts
      Compuesto.tsx
      CompuestoParte.tsx
  hooks/useX.ts             un hook por archivo, sin carpeta ni index
  utils/x.ts
  __tests__/                uno por feature (o por módulo)
  modules/<m>/              solo con ≥ 2 subdominios con UI propia; adentro, la misma forma, sin index
```

Mobile:

```
features/<name>/
  <Name>Screen.tsx
  index.ts                  único barrel: exporta el Screen (lo que importa app/)
  types.ts                  opcional
  components/ hooks/ utils/ igual que web
  X.test.tsx                al lado de X (nunca en app/)
app/<ruta>.tsx              solo la ruta: importa @/features/<name>
```

- **Carpetas de un solo archivo:** `components/`, `hooks/` y `utils/` se crean al agregar el primer archivo de esa categoría y se usan aunque tengan uno solo (son categorías, no una carpeta por archivo). Un componente tiene carpeta propia solo si tiene auxiliares, y se importa como `./components/X/X`.
- **Barrels:** solo en las fronteras que se consumen desde afuera: `features/<name>/`, `core/<area>/`, `shared/<area>/`, `layouts/` y `__tests__/helpers/`. En esas fronteras se permite un barrel de una línea, porque es la API del alias. Nunca dentro de `components/`, `hooks/`, `utils/` o `modules/`.
- **Hooks:** un hook exportado por archivo. Las constantes atadas a un hook van en su archivo. Los hooks nunca van en `utils/`.
- **Sin `modules/_shared`:** lo que comparten los módulos va en `components/`, `hooks/` o `utils/` de la raíz del feature.
- **Tests:** cada cliente mantiene su ubicación (web en `__tests__/`, mobile al lado del archivo).
- **Scaffolding:** `pnpm new-feature <name> [--web] [--mobile] [--path /x] [--register-route]`. Checklists: [web/new-feature.md](./web/new-feature.md) y [mobile/new-feature.md](./mobile/new-feature.md).

> **Migración en curso ([#122](https://github.com/Leancoggiola/omni/issues/122)):** el código nuevo sigue esta convención; las features existentes se migran en los PRs siguientes del issue (`core/serverWake/` y `shared/navigation/` en web también llegan con esa migración).

### Convenciones Web

| Elemento     | Convención                                                                 |
| ------------ | -------------------------------------------------------------------------- |
| Feature      | `<name>.page.tsx`, `<name>.routes.tsx` (navbar: `@omni/shared/navigation`) |
| Componentes  | `components/X.tsx`; `components/X/X.tsx` solo con auxiliares, sin index    |
| Hooks        | `hooks/useX.ts`, sin index                                                 |
| Imports      | `@/shared/api`, `@/core/auth`, `@/features/media`                          |
| Dependencias | Un feature **no** importa otro feature                                     |

### Path aliases

`@/*` → `src/*` (y subpaths `@/features`, `@/shared`, `@/core`, `@/layouts`, `@/theme`, `@/assets`).

> `@/shared` (frontend) ≠ `@omni/shared` (paquete monorepo de tipos/schemas).

---

## Paralelo Web ↔ API

| Concepto               | API                                                                                                   | Web                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Utilidades compartidas | `common/db/`, `common/utils/`                                                                         | `shared/api/`                                                                        |
| Módulos de producto    | `auth/`, `admin/`, `media/`, `users/`, `pantry/`, `gym/`, `expenses/`, `split-expenses/`, `holidays/` | `features/auth/`, `features/media/`, `features/profile/`, `features/split-expenses/` |
| Setup global           | `config.ts`, `main.ts`                                                                                | `core/`, `layouts/`, `main.tsx`                                                      |
| Servicios              | `*.service.ts`                                                                                        | hooks en `features/*/hooks/` o `features/*/modules/*/hooks/`                         |
| Validación             | `common/utils/validate.ts` (Zod middleware)                                                           | Schemas de `@omni/shared`                                                            |
| Auth                   | Cookie **o** Bearer JWT                                                                               | Cookies `httpOnly` + `credentials: 'include'`                                        |

### Auth dual (web + mobile)

`POST /api/auth/login` y `POST /api/auth/refresh`:

- Siempre setean cookies (compat web).
- Siempre incluyen `accessToken` y `refreshToken` en el JSON (`AuthTokensResponse` en `@omni/shared/auth`).
- Rutas protegidas: Passport acepta cookie `access_token` **o** header `Authorization: Bearer`.
- Refresh: cookie `refresh_token`, Bearer, o body `{ refreshToken }` (`refreshTokenBodySchema`).
- Logout: no pide access token (funciona con la sesión vencida). Revoca el refresh token del body `{ refreshToken }` o, si no viene o es inválido, el de la cookie, junto con toda su cadena de tokens rotados (así un token viejo de esa sesión da 401 sin parecer un reuso) y, si se rotó hace menos de `ROTATION_GRACE_MS`, sus sucesores sin usar; ignora `Authorization`. Lo extrae la estrategia de passport `logout`, que nunca rechaza. No tiene limiter propio: responde 200 y borra las cookies en todos los casos, salvo un 429 del limiter global.
- La cookie de refresh viaja a `/api/auth/*` (no solo a `/refresh`) para que el logout de la web identifique la sesión que cierra.
- `POST /api/auth/logout-all` (con access token) borra todos los refresh tokens del usuario y las cookies: ningún dispositivo puede volver a refrescar, y los access tokens ya emitidos valen hasta vencer (15 min).
- Vigencia del refresh token: la app mobile manda `X-Client: mobile` (`CLIENT_HEADER`) en login y refresh y recibe `JWT_REFRESH_EXPIRES_IN_MOBILE` (90 días); sin el header vale `JWT_REFRESH_EXPIRES_IN` (7 días, igual que la cookie de la web). Cada refresh emite el token con la vigencia completa desde ese momento: la sesión de mobile vence solo tras 90 días sin uso. El header no se autentica, a propósito: solo elige la vigencia. Quien lo manda ya presentó el password o un refresh token válido, y con ese token alcanza para mantener viva una sesión de 7 días refrescando antes de que venza. Lo que cambia es el caso de un refresh token robado y abandonado: dura 90 días sin uso en vez de 7. Para cortarlo está "Cerrar sesión en todos los dispositivos". La API no arranca si `JWT_REFRESH_EXPIRES_IN_MOBILE` es más corto que `JWT_REFRESH_EXPIRES_IN`.

Cada refresh token lleva un `jti` aleatorio y en la base se guarda su sha256 (`RefreshToken.tokenHash`, único). El refresh lo rota de forma atómica marcando la fila con `rotatedAt`, que queda en la base hasta vencer. Un token ya rotado se juzga por sus descendientes (el sucesor y las hermanas). Durante una ventana de gracia corta medida desde la rotación (`ROTATION_GRACE_MS`), mientras su sucesor siga sin usarse, recibe una sesión hermana, hasta `MAX_GRACE_SIBLINGS`, y después un 401 que no revoca nada. Pasada la ventana, si ningún descendiente se usó, la respuesta de la rotación no llegó a guardarse (la app murió, se cortó la red o falló SecureStore): se borran esos descendientes y el token se vuelve a rotar, sin cerrar la sesión. Es un reuso, y revoca todas las sesiones del usuario, solo si ya se usó el sucesor (dentro de la ventana) o algún descendiente (fuera de ella). Un token que ya no está en la base (cerrado, expulsado por el tope o revocado), o uno rotado cuyo sucesor ya no está, da 401 sin tocar las otras sesiones. Cada refresh rechazado deja en el log de la API (`Refresh rechazado`) su motivo y el usuario, nunca el token: `missing`, `expired`, `invalid`, `userNotFound`, `notFound`, `successorGone`, `graceExhausted` o `reused`; las expulsiones por el tope se loguean aparte (`Sesiones expulsadas por el tope`). `login` y `refresh` podan las filas vencidas, `login` aplica un tope de sesiones vigentes por usuario (`MAX_SESSIONS_PER_USER`), y cambiar la contraseña las revoca todas. Toda transacción que escribe los refresh tokens de un usuario toma antes su advisory lock (`lockUserSessions`).

Las filas rotadas se conservan hasta que vence su token, a propósito: si un token robado se usa primero y el atacante lo sigue rotando, el dispositivo legítimo vuelve con un token viejo de la cadena y solo esa fila permite reconocer el reuso y revocar todo. Podarlas antes convertiría ese caso en un 401 que no revoca nada. El costo es una fila por refresh: con un access token de 15 min, como mucho unas 670 filas por navegador (refresh de 7 días) y unas 8600 por celular (90 días) en uso continuo, que se podan al vencer. En la práctica mobile refresca solo al abrir la app pasados 15 min, así que son muchas menos. Todas las búsquedas van por índice (`tokenHash` único, `previousTokenHash` y `userId`). Si el volumen crece, la alternativa es guardar un id de familia por cadena y revocar la familia en vez de conservar cada fila.

Web ignora los tokens del body. Mobile los guarda en SecureStore, en una sola clave (JSON con access y refresh, para que una rotación nunca deje un par mezclado), y no depende de cookies. Solo un 401/403 del refresh cierra la sesión de mobile; un 5xx, un 429 o un error de red conservan los tokens. El logout de mobile espera un refresh en curso (con tope) y manda en el body el refresh token vigente al momento de enviar.

**Sesión en la web.** El login guarda en la caché de SWR solo `{ user }`: los tokens del body no se guardan y la sesión vive en las cookies `httpOnly`. Login y logout vacían toda la caché de SWR (`clearSession` de `AuthContext`) para que el usuario siguiente de la pestaña no vea los datos del anterior. El logout no depende de la API: limpia la sesión local aunque el POST falle, y eliminar la cuenta la limpia sin llamar a `/logout`. El refresh solo cierra la sesión ante un 401/403; ante un 5xx, un 429 o un error de red `ProtectedRoute` muestra un error con reintento.

---

## Agregar una nueva feature

- **API:** carpeta `src/<feature>/` con routes + service; registrar en `router.ts`.
- **Web:** [web/new-feature.md](./web/new-feature.md) · tooling [web/tooling.md](./web/tooling.md).
- **Mobile:** [mobile/new-feature.md](./mobile/new-feature.md).

---

## Shared UI (Web)

Componentes usados en 2+ features → `shared/ui/<Component>/`.

---

## `packages/shared/`

Tipos, schemas y lógica pura compartidos entre API, Web y Mobile. Se importan por subpath (`@omni/shared/media`): no hay entrada raíz. Tiene su propio runner de tests (Vitest).

```
shared/src/
  auth/            ← ROLES/Role, schemas de login y alta de usuario, toSessionUser, tipos de sesión
  users/           ← perfil, contraseña, preferencias
  media/           ← MediaItem, tipos y estados, schemas, tipos de TMDB
  gym/             ← planes y ejercicios
  expenses/        ← gastos personales y recordatorios
  split-expenses/  ← amigos, juntadas, balances y liquidaciones
  pantry/          ← alacena, lista de compras, alertas
  holidays/        ← tipos de efemérides
  common/          ← paginación, cotas de entrada, fechas en la zona de la app, roundMoney
  theme/           ← tokens de color, medidas, contrastRatio
  navigation/      ← NAV_REGISTRY (navbar web, tabs y "Más" mobile)
  server-wake/     ← createServerWake: cold start de la API
```
