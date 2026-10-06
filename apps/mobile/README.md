# Mobile — Omni (Expo)

App Android con **Expo Router**, **Tamagui**, **SWR** y `@omni/shared`. Paridad con web: auth, home, media, profile.

## Requisitos

- Node ≥ 18, pnpm
- API corriendo (`pnpm dev:api`) escuchando en la red local
- Development Build (no Expo Go): Tamagui + SecureStore

## Configurar API para el celular

1. Misma Wi‑Fi que la PC.
2. Creá `apps/mobile/.env`:

```bash
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

Reemplazá por la IP LAN de tu máquina (`ipconfig` en Windows).

3. La API ya puede bind a `0.0.0.0` en prod; en local asegurate de poder alcanzar el puerto 3000 desde el device.
4. `app.json` habilita `usesCleartextTraffic` para HTTP en desarrollo.

## Scripts

Desde la raíz:

```bash
pnpm dev:mobile
```

Desde `apps/mobile`:

```bash
pnpm prebuild          # genera android/ (dev client)
pnpm android           # Metro + Android
pnpm check-types
pnpm lint
```

Primera vez en device/emulador: `pnpm prebuild` y luego build del dev client (`npx expo run:android`).

## Auth

- Login/refresh devuelven `accessToken` + `refreshToken` (además de cookies para web).
- Tokens en `expo-secure-store`.
- Requests: `Authorization: Bearer <access>`.
- 401 → refresh automático → reintento.

## Estructura

```
apps/mobile/
  app/                 # Expo Router (login, tabs)
  src/core/auth/       # AuthProvider + SecureStore
  src/shared/api/      # API_KEYS, client Bearer
  src/features/        # auth, home, media, profile
  src/theme/           # Tamagui config
```

Paths HTTP solo en `src/shared/api/keys.ts` (`API_KEYS`).

## Tooling agentes

Ver [docs/mobile/tooling.md](../../docs/mobile/tooling.md) y [CLAUDE.md](../../CLAUDE.md).
