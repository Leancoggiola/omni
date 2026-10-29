# Web — convenciones

Hooks SWR: skill `swr-hooks`. Formularios: skill `mantine-form`. Nueva feature: `/new-feature`.

## Estructura

| Capa            | Uso                                                            |
| --------------- | -------------------------------------------------------------- |
| `src/app/`      | `router.tsx`, `routes.ts`                                      |
| `src/features/` | Dominio (1 ítem de navbar = 1 feature)                         |
| `src/shared/`   | `api/`, `navigation/` y `ui/` (`@/shared` ≠ `@omni/shared`)    |
| `src/core/`     | `auth`, `guards`, `providers`, `serverWake` y `theme` globales |
| `src/layouts/`  | Shell (RootLayout, Navbar, Header)                             |
| `src/theme/`    | Mantine theme                                                  |

Estructura de features (árbol y reglas): [docs/architecture.md](../../docs/architecture.md#estructura-de-features-web-y-mobile).

- **Prohibido:** `features/A` → `features/B` (lo hace cumplir ESLint). UI usada en 2+ features → `shared/ui/`.
- Navbar: clave en `NAV_REGISTRY` / `MAIN_NAV_ORDER` de `@omni/shared/navigation` (compartido con mobile) + ícono en `NAV_ICONS` de `shared/navigation/nav-registry.tsx`.
- Scaffolding: `pnpm new-feature <name> --web --register-route` desde la raíz (ver `docs/web/new-feature.md`).
- Referencias: `home` (simple), `media` (SWR + mutations), `profile` (forms + PATCH), `split-expenses` (CRUD anidado).

## API paths

Todos los endpoints en `API_PATHS` de `@omni/shared/api` (`packages/shared/src/api/paths.ts`, el mismo mapa que mobile); `src/shared/api/keys.ts` lo re-exporta como `SWR_KEYS`. Rutas dinámicas como helpers (`listItem: (id) => ...`), nunca inline.

**Prohibido:** literales `'/api/...'` fuera de ese mapa. Verificación: `pnpm --filter web check-api-paths`.

El núcleo HTTP (request JSON, 401 → refresh single-flight → reintento, parseo de errores y 204) es `createApiClient` de `@omni/shared/api`, con sus tests en `packages/shared`. `src/shared/api/client.ts` es el adaptador de cookies: `credentials: 'include'`, el refresh (`true` renovó, `false` con 401/403, lanza ante cualquier otra respuesta) y `setOnAuthFailure`, que se avisa una vez por refresh fallido.

## Cold start de la API

La API (Render free) duerme y tarda ~1 min en despertar (tope de espera: 90 s, el último sondeo incluido). `fetcher`, `api` y el refresh usan `fetchWithWake` (`shared/api/serverWake.ts`), nunca `fetch` directo: reintenta solo si la respuesta es del proxy o de la plataforma (no es JSON y trae status 502/503/504 o `content-type: text/html`: el request no llegó a la API, se reintenta con cualquier método salvo un 504 en un request no idempotente, que lanza `ApiError` 504 porque la API pudo procesarlo; cualquier JSON, aunque sea un 502 de la API, un 404 o un 304 se devuelven tal cual) o si `fetch` lanza un error de red, y esto último solo en GET/HEAD/PUT/DELETE (en POST/PATCH el error se propaga: no se sabe si la API llegó a procesarlo). Cada intento tiene tope hasta los headers, 30 s si es idempotente y 100 s si no (POST/PATCH esperan el cold start, que retiene el request ~1 min): al vencer lanza `ApiError` con status 0 (si es idempotente cuenta como error de red), y un `signal` del caller se respeta. El refresh se pide con `{ idempotent: true }`: la API acepta la misma cookie dentro de su gracia de rotación. Hace polling a `SWR_KEYS.health` con backoff y, si no despierta, lanza `ApiError` 503. Sin conexión no espera 90 s: con `navigator.onLine === false` corta enseguida, y si no, tras 2 sondeos seguidos con error de red (no por su timeout) sin ninguna respuesta HTTP previa; en ambos casos sin aviso y relanzando el error de red del request (el `ErrorState` aparece casi al instante); una respuesta del proxy (502/503/504, HTML) o un timeout del sondeo siguen el polling. `ServerWakeNotice` (`core/serverWake`) muestra el aviso, que aparece cuando falla el primer sondeo o pasan ~1,5 s sin respuesta, lo que ocurra primero. Cualquier POST/PATCH (no solo el login) que pasa 1,5 s sin headers sondea el health en paralelo (sin reintentarse) para encender el aviso, y uno que sale con un sondeo en curso lo espera antes de enviarse (hasta 90 s). `LoginPage` llama a `ensureServerAwake()` al montar, así la API despierta mientras el usuario escribe; el POST del login espera ese sondeo si sigue en curso, y los campos quedan deshabilitados mientras carga. `serverWake.ts` es solo una instancia de `createServerWake` de `@omni/shared/server-wake` (que tiene la orquestación, las constantes y la decisión pura); los tests de esa lógica viven en `packages/shared/src/server-wake/__tests__/`; `shared/api/__tests__/serverWake.test.ts` solo prueba el cableado de la instancia web y su integración con `fetcher`, `api` y el refresh.

## SWR

| Caso                             | Hook                                                        |
| -------------------------------- | ----------------------------------------------------------- |
| Read, rara revalidación (perfil) | `useSWRImmutable`                                           |
| Read, lista propia + filtros UI  | `useSWRImmutable` + filtrado client-side                    |
| Read, datos que cambian          | `useSWR`                                                    |
| Write, misma key                 | `useSWRMutation` + `populateCache: true, revalidate: false` |
| Write, update optimista          | `useSWRConfig().mutate` + `optimisticData`                  |
| Write, invalidar varias keys     | `useSWRConfig().mutate` + `startsWith`                      |

El `SWRConfig` global (`core/providers/SWRProvider.tsx`) aplica `SWR_RETRY_OPTIONS` de `@omni/shared/api`, igual que mobile: 3 reintentos, salvo los 4xx que no son 408 ni 429. El `error` aparece desde el primer fallo y los reintentos siguen en segundo plano.

Un hook por archivo en `hooks/` (`hooks/useX.ts`), nombre de función = nombre de archivo. Return: dominio + `isLoading` + `error` (+ `isMutating` en mutations). `buildQueryString` para query params.

## Estados de UI (Loading / Empty / Error)

Usar **siempre** los componentes de `@/shared/ui`. No armar variantes propias con `Center`/`Loader`/`Paper`.

```tsx
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui';

if (error) return <ErrorState message="No se pudo cargar tu lista" onRetry={() => void mutate()} />;
if (isLoading) return <LoadingState />;
if (items.length === 0) return <EmptyState icon={<Icon />} title="..." action={<Button />} />;
```

**El `error` de SWR se renderiza siempre**, con `onRetry` (el hook expone `mutate`). Un fetch fallido nunca debe verse como estado vacío.

## Formularios (`@mantine/form`)

- `useForm` + `<form onSubmit={form.onSubmit(handler)}>` + `form.getInputProps('campo')`.
- Validación con `schemaResolver(schema, { sync: true })` y schemas Zod de `@omni/shared`. Los `*FormSchema`/`*FormValues` que usa un solo cliente viven en `utils/<form>/` de su feature (`zod` es dependencia de `apps/web` solo para eso).
- Todo `<form>` lleva `noValidate`: los mensajes los da el schema (Zod), no el globo nativo del navegador, que rompe el estilo de la app y sale en el idioma del navegador. Cada campo `required` necesita una regla en el schema que cubra el vacío.
- Excepciones: búsquedas sin submit; campos custom actualizan con `form.setValues`.

### Reset de modales

El contenido de `<Modal>` se **desmonta** al cerrar (`keepMounted` es `false` por defecto). Por eso el formulario va en un **componente hijo**: su estado se reinicia solo.

```tsx
// ✅ shell con loading; el form vive en el hijo y se resetea al cerrar
<Modal opened={opened} onClose={handleClose} closeOnClickOutside={!loading}>
  <MiForm loading={loading} onSubmit={handleSubmit} onCancel={handleClose} />
</Modal>
```

**No usar** `useEffect(() => { if (!opened) form.reset() }, [opened])`: es innecesario y obliga a un `eslint-disable`.

Referencias: `AddMediaModal/`, `NewGatheringModal/`, `FriendsModal/`.

## Estado derivado de props

Para resincronizar estado local cuando cambia una prop, usar **remount con `key`**, no `useEffect`.

```tsx
<ProfileSettingsForm key={profile.updatedAt} profile={profile} />
<AddExpenseForm key={participants.map(p => p.id).join('|')} participants={participants} />
```

## Acciones destructivas

Guard de doble-submit + `finally`. Confirmación con `confirm()` de `@/shared/ui`.

```tsx
const handleDelete = async () => {
  if (deleting) return;
  if (!(await confirm({ title: '...', description: '...' }))) return;
  setDeleting(true);
  try {
    await remove(id);
    notifySuccess('Eliminado');
  } catch (err) {
    notifyError(getErrorMessage(err, 'No se pudo eliminar'));
  } finally {
    setDeleting(false);
  }
};
```

## Botones de acción (forms, modales, confirm)

Grupos de acciones de un form o modal van **alineados a la derecha**, nunca full-width ni sueltos como hijo directo de un `Stack` (se estiran por el `align-items: stretch` del flex).

```tsx
// ✅ único botón
<Group justify="flex-end">
  <Button type="submit">Guardar</Button>
</Group>

// ✅ par confirmar/cancelar — cancelar primero (outline), confirmar al final (filled)
<Group justify="flex-end" gap="sm">
  <Button variant="outline" onClick={onCancel}>Cancelar</Button>
  <Button type="submit">Guardar</Button>
</Group>
```

- **Confirmar** = `variant` por defecto (filled). **Cancelar** = `variant="outline"`.
- Acciones destructivas standalone (ej. "Eliminar cuenta") **siguen siendo filled** con `color="destructive"` — no `outline`: si el usuario llegó al botón, ya pasó por la confirmación de `confirm()`.
- No usar `fullWidth` en estos botones: contradice el alineado a la derecha.
- Un form con varias `ProfileSectionCard`/`Paper` pero **una sola acción de guardado** no mete ese botón dentro de ninguna sección: envolver TODO el form (secciones + acción) en un `Paper` externo, separado por `Divider` antes del `Group` final. Ver `ProfileSettingsForm` — y la regla de bordes en anidamiento de Paper, más abajo.
- **El botón de confirmar arranca deshabilitado y se habilita recién cuando `form.isDirty()` es `true`.** Nunca queda "siempre activo" — evita submits vacíos y comunica que no hay nada para guardar todavía.

  ```tsx
  <Button type="submit" disabled={!form.isDirty()}>
    Guardar
  </Button>
  ```

  Funciona igual en `mode: 'controlled'` y `'uncontrolled'` — detalle en la skill `mantine-form`. No aplica a `onCancel`/`onClose` ni a acciones destructivas standalone.

- **Excepción: el login (`LoginPage`) no deshabilita "Ingresar" por `isDirty()`.** El autocompletado del navegador puede llenar usuario/contraseña sin disparar `onChange`, y el form quedaría "limpio" con el botón bloqueado; ahí la validación del schema (`loginSchema`) es la que frena el submit vacío.

- Referencias: `ConfirmProvider`, `AddMediaForm`, `NewGatheringForm`, `FriendForm`, `ProfileSettingsForm`, `PasswordForm`, `DeleteAccountButton`, `LoginPage`.

## Paper anidado

`Paper` y `Card` son glass de v2 (`surfaces-glass`, radio 24, `shadow="card"` y un borde `border-glass` que trae el theme). Un `Paper` apoyado directo sobre el canvas de la página **no** lleva `withBorder`: la sombra y el glass ya lo separan del fondo. Un `Paper` anidado dentro de otro `Paper` **sí** necesita `withBorder` (el theme lo pinta con `border-subtle`): comparten el mismo fondo glass, así que sin ese borde el límite entre ambos no es perceptible — problema de accesibilidad (contraste no textual), no solo estético.

```tsx
// ✅ Paper contra el canvas — sin borde
<Paper>...</Paper>

// ✅ Paper dentro de otro Paper — con borde
<Paper>
  <Paper withBorder>...</Paper>
</Paper>
```

Referencia: `ProfileSectionCard` acepta este caso vía su prop de borde cuando se usa dentro del `Paper` externo de `ProfileSettingsForm`.

## Feedback

| Situación                          | Patrón                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------- |
| Error de validación/submit en form | `Alert color="destructive"` inline (el theme ya aplica `light-custom`) |
| Éxito post-mutation                | `notifySuccess()`                                                      |
| Error fuera de form                | `notifyError(getErrorMessage(err, fallback))`                          |

Helpers en `@/shared/ui`. Mutaciones en hooks del módulo; las pages orquestan, no llaman `api.*`.

`getErrorMessage(err, fallback)` (de `@omni/shared/api`, re-exportado por `@/shared/ui`) muestra `err.message` solo si es un `ApiError` (el mensaje de la API, en español); cualquier otro error (red, parseo, un `new Error('…')` propio) muestra el fallback. Un mensaje propio para el usuario va en el fallback o en un `ApiError`.

## Imágenes ampliables

```tsx
import { openImageLightbox } from '@/shared/ui';
onClick={() => openImageLightbox({ src, alt })}
```

Un único `LightboxProvider` montado en `main.tsx`; no importar `@mantine/lightbox` desde features.

## Componentes

Separar por **responsabilidad**. Si un componente mezcla orquestación de datos con varias secciones de render, extraer subcomponentes presentacionales (ver `GatheringCard/`, `AddMediaModal/`).

## Nombres accesibles

Todo control sin texto visible necesita `aria-label`: `ActionIcon` de solo ícono, `Select` sin `label`, indicadores de carga.

```tsx
<ActionIcon aria-label={`Eliminar ${item.title}`}>…</ActionIcon>
<Select aria-label={`Estado de ${item.title}`} … />
```

Cuando el control se repite por fila, incluir el nombre del ítem: sin eso no se puede distinguir uno de otro. Además de ser un requisito de accesibilidad, es lo que hace que los E2E puedan seleccionarlo sin recurrir a clases CSS.

## Style props en rem

Dimensiones en style props de Mantine y `style={{ }}` inline van en **`rem`** (base 16px), no números ni px.

```tsx
// ❌ <Image h={280} />  <Badge top={8} />  style={{ minWidth: '200px' }}
// ✅ <Image h="17.5rem" />  <Badge top="0.5rem" />  style={{ minWidth: '12.5rem' }}
```

- Padding/margin/gap en cero → token `none` (`p="none"`), no `{0}`.
- Excepciones: porcentajes (`h="100%"`), tokens (`gap="md"`), no-dimensiones (`fw={600}`, `lineClamp={2}`).
- Iconos Phosphor: `size="1rem"`.

## Verificación

```bash
pnpm --filter web check-types && pnpm --filter web lint && pnpm --filter web check-api-paths && pnpm --filter web test && pnpm --filter web check-structure
```
