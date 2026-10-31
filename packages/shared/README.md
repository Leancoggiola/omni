# @omni/shared

Tipos TypeScript, schemas Zod, constantes y lógica pura compartidos entre la API, web y mobile.

Es un **Just-in-Time Package**: exporta TypeScript directo, sin paso de build. Los bundlers de las apps consumidoras (Vite en web, Metro en mobile, tsup en la API) lo compilan. No hay entrada raíz: cada dominio se importa por su subpath (`@omni/shared/media`), declarado una sola vez en `package.json#exports`.

## Exports

| Path                          | Contenido                                                                                                                                                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@omni/shared/api`            | Capa de datos de web y mobile: `ApiError`, `API_PATHS` + `buildQueryString`, `getErrorMessage`, `isClientError`, `SWR_RETRY_OPTIONS` y la fábrica `createApiClient` (401 → refresh single-flight → reintento, errores y 204)                        |
| `@omni/shared/auth`           | `loginSchema`, `createUserSchema`, `usernameSchema`, `refreshTokenBodySchema`, `ROLES`/`Role`, `ROLE_LABELS`, `toSessionUser` y los tipos de sesión (`SessionUser`, `AuthTokensResponse`)                                                           |
| `@omni/shared/users`          | Schemas de perfil, contraseña y preferencias (`updateProfileSchema`, `changePasswordSchema`, …), tipos (`UserProfile`, `AdminUser`) y `buildProfileUpdates`                                                                                         |
| `@omni/shared/media`          | Tipos y estados de media (`MEDIA_TYPES`, `MEDIA_STATUSES`), schemas de alta, edición, búsqueda y filtro (`MediaFilters`), tipos y utils de TMDB, constantes de imagen, opciones de estado y tipo, y `filterMediaItems`                              |
| `@omni/shared/gym`            | Planes y ejercicios de gimnasio: schemas, tipos y `GYM_PLAN_STATUSES`                                                                                                                                                                               |
| `@omni/shared/expenses`       | Gastos personales y recordatorios: categorías, prioridades, recurrencias, schemas y tipos                                                                                                                                                           |
| `@omni/shared/split-expenses` | Gastos compartidos: amigos, juntadas, schemas, tipos, `computeBalances`, `computeSettlements` y `summarizeGatheringPayments`                                                                                                                        |
| `@omni/shared/pantry`         | Alacena y lista de compras: categorías, unidades, schemas, tipos y alertas (`isLowStock`, `isExpiringSoon`)                                                                                                                                         |
| `@omni/shared/household`      | Hogar compartido: `HOUSEHOLD_MAX_MEMBERS`, vigencia y formato del código de invitación, `householdInviteCodeSchema` y los tipos (`HouseholdInfo`, `HouseholdInvitePreview`)                                                                         |
| `@omni/shared/holidays`       | Tipos de las efemérides (`TodayHolidays`, respuesta de Wikipedia), `MAX_HOLIDAY_ITEMS` y el carrusel                                                                                                                                                |
| `@omni/shared/common`         | Paginación, cotas de entrada (`INT4_MAX`, `AMOUNT_MAX_*`, …), fechas en la zona de la app (`appDateKey`, `monthRange`, `parseIsoDateString`, `isoDateStringSchema`), `roundMoney`, `formatMoney` y `getTimeGreeting`                                |
| `@omni/shared/theme`          | Escalas (`BRAND`, `TERRACOTTA`, `SAGE`, `CANVAS`, `SURFACE`, …), tokens semánticos y `SEMANTIC`, medidas, `contrastRatio` y `resolveColorScheme`: fuente única de color para web y mobile. Ver [docs/design-system.md](../../docs/design-system.md) |
| `@omni/shared/navigation`     | `NAV_REGISTRY`: labels, rutas y disponibilidad de cada módulo (navbar web, tabs y "Más" mobile)                                                                                                                                                     |
| `@omni/shared/server-wake`    | Cold start de la API: constantes, funciones puras y la fábrica `createServerWake`                                                                                                                                                                   |

## Uso

```typescript
// Schemas Zod (validación en la API y en los formularios)
import { loginSchema } from '@omni/shared/auth';
import { addMediaItemSchema, searchMediaSchema } from '@omni/shared/media';

// Tipos TypeScript
import type { LoginPayload, Role } from '@omni/shared/auth';
import type { MediaItem, MediaType, MediaStatus } from '@omni/shared/media';

// Constantes
import { MEDIA_TYPES, MEDIA_STATUSES } from '@omni/shared/media';
```

## Scripts

```bash
pnpm --filter @omni/shared test            # Vitest (corre una vez)
pnpm --filter @omni/shared test:watch      # Vitest en modo watch
pnpm --filter @omni/shared test:coverage   # Cobertura
pnpm --filter @omni/shared check-types     # Type checking
pnpm --filter @omni/shared lint            # Linting
```

Los tests van en `src/<dominio>/__tests__/` y los transversales en `src/__tests__/`; importan el dominio por ruta relativa.
