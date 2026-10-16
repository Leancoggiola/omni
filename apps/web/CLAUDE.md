# Web — convenciones

Hooks SWR: skill `swr-hooks`. Formularios: skill `mantine-form`. Nueva feature: `/new-feature`.

## Estructura

| Capa            | Uso                                                                        |
| --------------- | -------------------------------------------------------------------------- |
| `src/app/`      | `router.tsx`, `routes.ts`, `navigation/nav-registry.tsx`                   |
| `src/features/` | Dominio (1 ítem de navbar = 1 feature)                                     |
| `src/shared/`   | `api/` (client, fetcher, `SWR_KEYS`) y `ui/` (`@/shared` ≠ `@omni/shared`) |
| `src/core/`     | `auth`, `guards`, `providers` globales                                     |
| `src/layouts/`  | Shell (RootLayout, Navbar, Header)                                         |
| `src/theme/`    | Mantine theme                                                              |

```
features/<name>/
  <name>.routes.tsx · <name>.page.tsx · index.ts
  modules/<module>/
    components/<Component>/<Component>.tsx + index.ts
    hooks/useX/useX.ts + index.ts
  modules/_shared/        # compartido entre módulos del mismo feature
```

- **Prohibido:** `features/A` → `features/B`. UI usada en 2+ features → `shared/ui/`.
- Navbar: clave en `NAV_REGISTRY` / `MAIN_NAV_ORDER` de `@omni/shared/navigation` (compartido con mobile) + ícono en `NAV_ICONS` de `app/navigation/nav-registry.tsx`.
- Scaffolding: `pnpm web:new-feature <name> --register-route`.
- Referencias: `home` (simple), `media` (multi-módulo + SWR), `profile` (forms + PATCH), `split-expenses` (CRUD anidado).

## API paths

Todos los endpoints en `src/shared/api/keys.ts` como `SWR_KEYS`. Rutas dinámicas como helpers (`listItem: (id) => ...`), nunca inline.

**Prohibido:** literales `'/api/...'` fuera de `keys.ts`. Verificación: `pnpm --filter web check-api-paths`.

## Cold start de la API

La API (Render free) duerme y tarda ~1 min en despertar (tope de espera: 90 s, el último sondeo incluido). `fetcher`, `api` y el refresh usan `fetchWithWake` (`shared/api/serverWake.ts`), nunca `fetch` directo: reintenta solo si la respuesta es del proxy o de la plataforma (no es JSON y trae status 502/503/504 o `content-type: text/html`: el request no llegó a la API, se reintenta con cualquier método salvo un 504 en un request no idempotente, que lanza `ApiError` 504 porque la API pudo procesarlo; cualquier JSON, aunque sea un 502 de la API, un 404 o un 304 se devuelven tal cual) o si `fetch` lanza un error de red, y esto último solo en GET/HEAD/PUT/DELETE (en POST/PATCH el error se propaga: no se sabe si la API llegó a procesarlo). Cada intento tiene tope hasta los headers, 30 s si es idempotente y 100 s si no (POST/PATCH esperan el cold start, que retiene el request ~1 min): al vencer lanza `ApiError` con status 0 (si es idempotente cuenta como error de red), y un `signal` del caller se respeta. El refresh se pide con `{ idempotent: true }`: la API acepta la misma cookie dentro de su gracia de rotación. Hace polling a `SWR_KEYS.health` con backoff y, si no despierta, lanza `ApiError` 503. Sin conexión no espera 90 s: con `navigator.onLine === false` corta enseguida, y si no, tras 2 sondeos seguidos con error de red (no por su timeout) sin ninguna respuesta HTTP previa; en ambos casos sin aviso y relanzando el error de red del request (el `ErrorState` aparece casi al instante); una respuesta del proxy (502/503/504, HTML) o un timeout del sondeo siguen el polling. `ServerWakeNotice` (`core/providers`) muestra el aviso, que aparece cuando falla el primer sondeo o pasan ~1,5 s sin respuesta, lo que ocurra primero. `serverWake.ts` es solo una instancia de `createServerWake` de `@omni/shared/server-wake` (que tiene la orquestación, las constantes y la decisión pura); los tests de esa lógica viven en `shared/api/__tests__/serverWake.test.ts` porque `packages/shared` no tiene runner.

## SWR

| Caso                             | Hook                                                        |
| -------------------------------- | ----------------------------------------------------------- |
| Read, rara revalidación (perfil) | `useSWRImmutable`                                           |
| Read, lista propia + filtros UI  | `useSWRImmutable` + filtrado client-side                    |
| Read, datos que cambian          | `useSWR`                                                    |
| Write, misma key                 | `useSWRMutation` + `populateCache: true, revalidate: false` |
| Write, update optimista          | `useSWRConfig().mutate` + `optimisticData`                  |
| Write, invalidar varias keys     | `useSWRConfig().mutate` + `startsWith`                      |

Un hook por carpeta, nombre de función = nombre de carpeta. Return: dominio + `isLoading` + `error` (+ `isMutating` en mutations). `buildQueryString` para query params.

## Estados de UI (Loading / Empty / Error)

Usar **siempre** los componentes de `@/shared/ui`. No armar variantes propias con `Center`/`Loader`/`Paper`.

```tsx
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui';

if (error) return <ErrorState message="No se pudo cargar tu lista" />;
if (isLoading) return <LoadingState />;
if (items.length === 0) return <EmptyState icon={<Icon />} title="..." action={<Button />} />;
```

**El `error` de SWR se renderiza siempre.** Un fetch fallido nunca debe verse como estado vacío.

## Formularios (`@mantine/form`)

- `useForm` + `<form onSubmit={form.onSubmit(handler)}>` + `form.getInputProps('campo')`.
- Validación con `schemaResolver(schema, { sync: true })` y schemas Zod de `@omni/shared` (`zod` **no** es dependencia de `apps/web`).
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

Un `Paper` apoyado directo sobre el canvas de la página **no** lleva borde (el `shadow="sm"` ya alcanza para separarlo del fondo). Un `Paper` anidado dentro de otro `Paper` **sí** necesita `withBorder`: comparten el mismo `surfaceBg`, así que sin borde el límite entre ambos no es perceptible — problema de accesibilidad (contraste no textual), no solo estético.

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

`getErrorMessage(err, fallback)` muestra `err.message` solo si es un `ApiError` (el mensaje de la API, en español); cualquier otro error (red, parseo, un `new Error('…')` propio) muestra el fallback. Un mensaje propio para el usuario va en el fallback o en un `ApiError`.

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
pnpm --filter web check-types && pnpm --filter web lint && pnpm --filter web check-api-paths && pnpm --filter web test
```
