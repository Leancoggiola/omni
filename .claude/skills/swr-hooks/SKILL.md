---
name: swr-hooks
description: Patrones SWR del proyecto para apps/web. Usar al crear, modificar o revisar hooks de datos en apps/web/src/features/*/modules/*/hooks/ o apps/web/src/core/auth/ (useSWR, useSWRImmutable, useSWRMutation, useSWRConfig, SWR_KEYS, buildQueryString, useAuth, useProfile, useMyMediaList, useMediaMutations).
---

# SWR hooks — omni

> **Documento vivo:** si la tarea establece un patrón de hook que no está acá, actualizar esta skill antes de darla por terminada.

## Imports y keys

Keys en `apps/web/src/shared/api/keys.ts`, exportadas por `@/shared/api`. Nunca URLs literales en hooks.

```ts
import { api, SWR_KEYS, buildQueryString } from '@/shared/api';
```

`buildQueryString` ordena los params alfabéticamente: usarlo siempre para que la cache key sea estable.

## Árbol de decisión

```
¿Read que casi nunca cambia en el server (sesión, perfil)?
└── useSWRImmutable  ← sin revalidación en focus/reconnect

¿Read de una colección propia del usuario, filtrada en UI (biblioteca de media)?
└── useSWRImmutable sobre la key sin params + filtro en el hook
    └── Writes → useSWRConfig().mutate + optimisticData, revalidate: false

¿Read que cambia en el server (búsqueda, feeds compartidos)?
└── useSWR  ← revalidación por defecto

¿Write (PATCH, POST, DELETE)?
├── Misma key que el read y la respuesta es el valor nuevo → useSWRMutation (populateCache, revalidate: false)
├── Update optimista de una lista cacheada → useSWRConfig().mutate + optimisticData
└── Invalidar varias keys → useSWRConfig().mutate con filtro startsWith
```

## Patrones

### Read estático (`useSWRImmutable`)

```ts
export function useProfile() {
  const { data, isLoading, error } = useSWRImmutable<{ user: UserProfile }>(SWR_KEYS.users.profile);
  return { profile: data?.user ?? null, isLoading, error };
}
```

### Read dinámico (`useSWR`)

```ts
export function useMediaSearch(query: string) {
  const key = query ? `${SWR_KEYS.media.search}${buildQueryString({ q: query })}` : null;
  return useSWR<TmdbSearchResponse>(key);
}
```

### Lista propia + filtro client-side

Un solo fetch sin query params y filtro en el hook: evita un request por tab/filtro y deja una única key para los writes optimistas.

```ts
export function useMyMediaList(filters: MediaFilters = {}) {
  const { data, isLoading, error } = useSWRImmutable<MediaItem[]>(SWR_KEYS.media.list);

  const filtered = useMemo(() => {
    if (!data) return data;
    return data.filter(item => {
      if (filters.status && item.status !== filters.status) return false;
      if (filters.mediaType && item.mediaType !== filters.mediaType) return false;
      return true;
    });
  }, [data, filters.mediaType, filters.status]);

  return { data: filtered, allItems: data, isLoading, error };
}
```

Exponer `allItems` cuando la UI necesita el set completo (ej. chequear "ya está en la lista").

### Write sobre la misma key (`useSWRMutation`)

```ts
const { trigger: updateProfile, isMutating } = useSWRMutation(
  SWR_KEYS.users.profile,
  (_url: string, { arg }: { arg: UpdateProfilePayload }) =>
    api.patch<{ user: UserProfile }>(SWR_KEYS.users.profile, arg),
  { populateCache: true, revalidate: false }
);
```

`populateCache` escribe la respuesta en la cache del read; `revalidate: false` evita el GET redundante.

### Write optimista sobre una lista (`useSWRConfig`)

```ts
const { mutate } = useSWRConfig();

const updateStatus = useCallback(
  async (itemId: string, status: MediaStatus) => {
    let updated: MediaItem | undefined;
    await mutate(
      SWR_KEYS.media.list,
      async (current: MediaItem[] | undefined) => {
        updated = await api.patch<MediaItem>(SWR_KEYS.media.listItem(itemId), { status });
        return current?.map(item => (item.id === itemId ? updated! : item)) ?? [updated!];
      },
      {
        optimisticData: (current: MediaItem[] | undefined) =>
          current?.map(item => (item.id === itemId ? { ...item, status } : item)) ?? [],
        rollbackOnError: true,
        populateCache: true,
        revalidate: false,
      }
    );
    return updated!;
  },
  [mutate]
);
```

### Invalidar varias keys

Solo cuando un write tiene que invalidar keys distintas (no es el camino preferido para la lista de media):

```ts
mutate((key: unknown) => typeof key === 'string' && key.startsWith(SWR_KEYS.media.list), undefined, {
  revalidate: true,
});
```

## Auth vs perfil — dos caches, dos shapes

| Hook         | Key                      | Tipo                                    | Dónde se usa             |
| ------------ | ------------------------ | --------------------------------------- | ------------------------ |
| `useAuth`    | `SWR_KEYS.auth.profile`  | `SessionUser` (sin `id`)                | Shell, guards, login     |
| `useProfile` | `SWR_KEYS.users.profile` | `UserProfile` (con `id`, `preferences`) | Solo la página de perfil |

- En layout/shell usar `useAuth` para `name`, `email`, `avatarUrl`; nunca `useProfile`.
- Tras `updateProfile`, sincronizar la cache de auth con `toSessionUser(profile)` vía `useSWRConfig().mutate(SWR_KEYS.auth.profile, …)`.
- `updatePreferences` hace PATCH a `SWR_KEYS.users.preferences` y mergea en la cache del perfil. No existe `GET /api/users/preferences`: las preferencias vienen de `GET /api/users/profile`.
- Login: `await mutate(apiResponse, { revalidate: false })`. Logout: `await mutate(undefined, { revalidate: false })` — ambos con el mutate bound del `useSWRImmutable` de `AuthContext`.

## Shape de retorno

| Campo                                        | Tipo                    | Cuándo                  |
| -------------------------------------------- | ----------------------- | ----------------------- |
| `data` o alias de dominio (`profile`)        | `T \| null`             | siempre                 |
| `isLoading`                                  | `boolean`               | siempre                 |
| `error`                                      | `ApiError \| undefined` | siempre                 |
| `isMutating`                                 | `boolean`               | si usa `useSWRMutation` |
| `trigger` con alias verbal (`updateProfile`) | `function`              | solo mutations          |

## Qué no hacer

- Importar el `mutate` global de `swr`: usar el bound de `useSWR`/`useSWRImmutable` o `useSWRConfig`.
- Armar query strings con `URLSearchParams`: usar `buildQueryString`.
- Usar `useSWRMutation` solo para invalidar: usar `useSWRConfig` + `startsWith`.
