# Nuevo feature mobile

Checklist paralelo a [web/new-feature.md](../web/new-feature.md).

1. ¿Contrato nuevo? → `packages/shared` primero, luego API si hace falta.
2. `API_KEYS` en `apps/mobile/src/shared/api/keys.ts`.
3. Hook en `src/features/<name>/` (skill `mobile-feature`).
4. Screen Tamagui + ruta Expo Router en `app/`.
5. Auth: asumir Bearer ya configurado; no usar cookies.
6. Verificar: `pnpm --filter mobile check-types`.

Si el feature también va a web, implementar ambos clientes en el mismo PR de producto o PRs enlazados; shared/API una sola vez.
