---
description: 'Convenciones de apps/web: estructura de features, SWR_KEYS, hooks, formularios Mantine, estados de UI compartidos y style props en rem.'
applyTo: 'apps/web/**'
---

# Web — convenciones

Referencias completas: skills `web-structure`, `swr-hooks` (`.github/skills/`).

## Estructura

| Capa        | Uso                                                       |
| ----------- | --------------------------------------------------------- |
| `app/`      | Router, routes, navigation registry                       |
| `features/` | Dominio (1 ítem de navbar = 1 feature)                    |
| `shared/`   | API client, UI reutilizable (`@/shared` ≠ `@omni/shared`) |
| `core/`     | Auth, guards, providers globales                          |
| `layouts/`  | Shell (RootLayout, Navbar, Header)                        |
| `theme/`    | Mantine theme                                             |

```
features/<name>/
  <name>.routes.tsx · <name>.page.tsx · <name>.nav.tsx · index.ts
  modules/<module>/
    components/<Component>/<Component>.tsx + index.ts
    hooks/useX/useX.ts + index.ts
  modules/_shared/        # compartido entre módulos del mismo feature
```

- **Prohibido:** `features/A` → `features/B`. UI usada en 2+ features → `shared/ui/`.
- Scaffolding: `pnpm web:new-feature <name> --register-route --register-nav`.
- Referencias: `home` (simple), `media` (multi-módulo + SWR), `profile` (forms + PATCH), `split-expenses` (CRUD anidado).

## API paths

Todos los endpoints en `apps/web/src/shared/api/keys.ts` como `SWR_KEYS`. Rutas dinámicas como helpers (`listItem: (id) => ...`), nunca inline.

**Prohibido:** literales `'/api/...'` fuera de `keys.ts`. Verificación: `pnpm --filter web check-api-paths`.

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

## Feedback

| Situación                          | Patrón                                             |
| ---------------------------------- | -------------------------------------------------- |
| Error de validación/submit en form | `Alert color="destructive" variant="light"` inline |
| Éxito post-mutation                | `notifySuccess()`                                  |
| Error fuera de form                | `notifyError(getErrorMessage(err, fallback))`      |

Helpers en `@/shared/ui`. Mutaciones en hooks del módulo; las pages orquestan, no llaman `api.*`.

## Imágenes ampliables

```tsx
import { openImageLightbox } from '@/shared/ui';
onClick={() => openImageLightbox({ src, alt })}
```

Un único `LightboxProvider` montado en `main.tsx`; no importar `@mantine/lightbox` desde features.

## Componentes

Separar por **responsabilidad**. Si un componente mezcla orquestación de datos con varias secciones de render, extraer subcomponentes presentacionales (ver `GatheringCard/`, `AddMediaModal/`).

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
