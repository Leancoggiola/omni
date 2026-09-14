---
name: mobile-feature
description: Folder structure, routing and SWR/API hooks for apps/mobile (Expo Router, Tamagui, Bearer auth). Use when creating or moving files under apps/mobile, or creating hooks under apps/mobile/src/features.
---

# Mobile feature — Omni

## Layout

```
apps/mobile/
  app/                    # Expo Router
    _layout.tsx           # Tamagui + AuthProvider + AuthGate
    login.tsx
    (tabs)/index|media|profile.tsx
  src/
    core/auth/
    shared/api/           # API_KEYS, client, tokenStorage
    features/<name>/
    theme/tamagui.config.ts
```

## Nuevo feature

1. `src/features/<name>/` con screen + hooks
2. Ruta en `app/` (tab o stack)
3. Keys en `API_KEYS` si hay HTTP
4. Schemas en `@omni/shared` si el contrato es nuevo

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

Auth refresh lo maneja el client (`401` → refresh). No reimplementar en cada hook.

Return shape: dominio + `isLoading` + `error` (+ `isMutating` si aplica).

Paridad web: skill `swr-hooks` (cookies); acá Bearer + `EXPO_PUBLIC_API_URL`.

## Docs

`docs/mobile/tooling.md` · `docs/mobile/new-feature.md`
