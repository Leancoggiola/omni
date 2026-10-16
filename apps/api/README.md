# API — Omni

API REST para la aplicación de media tracking. Gestiona autenticación de usuarios y CRUD de items de media con integración a TMDB.

## Stack

| Tecnología             | Uso                                                               |
| ---------------------- | ----------------------------------------------------------------- |
| **Express 5**          | HTTP framework                                                    |
| **Prisma**             | ORM, migraciones y type-safe queries                              |
| **PostgreSQL**         | Base de datos (Supabase)                                          |
| **Passport.js**        | Autenticación con 3 strategies (local, jwt, jwt-refresh)          |
| **Zod**                | Validación de payloads (schemas compartidos desde `@omni/shared`) |
| **bcrypt**             | Hash de passwords                                                 |
| **Helmet**             | Headers de seguridad HTTP                                         |
| **express-rate-limit** | Rate limiting en rutas de auth                                    |
| **tsup**               | Bundler para producción                                           |
| **tsx**                | Runner con hot reload para desarrollo                             |

## Estructura de carpetas

```
src/
├── main.ts                    # Entry point — Express app + Prisma connect
├── config.ts                  # Variables de entorno tipadas y centralizadas
├── router.ts                  # Router principal (monta /auth y /media)
├── lib/
│   └── prisma.ts              # Singleton del Prisma Client
├── middleware/
│   ├── error-handler.ts       # Middleware global de errores (AppError → JSON)
│   └── validate.ts            # Middleware de validación Zod (body o query)
├── auth/
│   ├── auth.routes.ts         # POST register, login, refresh, logout | GET profile
│   ├── auth.service.ts        # Lógica: JWT sign/verify, bcrypt, refresh token rotation
│   ├── middleware/
│   │   └── auth.middleware.ts  # Wrappers de passport.authenticate
│   └── strategies/
│       ├── local.strategy.ts   # Email + password → user
│       ├── jwt.strategy.ts     # Bearer token → { userId }
│       └── jwt-refresh.strategy.ts  # Cookie refresh_token → { userId, refreshToken }
├── media/
│   ├── media.routes.ts        # CRUD de lista + búsqueda TMDB
│   ├── media.service.ts       # Queries Prisma (list, add, update, remove)
│   └── tmdb.service.ts        # Client para TMDB API (search, detalle para alta)
└── users/
    └── users.service.ts       # Queries de usuario (create, findByEmail, findById)
```

## Endpoints

Todas las rutas están bajo el prefijo `/api`.

### Auth (`/api/auth`)

| Método | Ruta        | Auth      | Rate Limit | Body/Query                  | Descripción                                    |
| ------ | ----------- | --------- | ---------- | --------------------------- | ---------------------------------------------- |
| `POST` | `/register` | ❌        | 10/15min   | `{ name, email, password }` | Crea usuario, retorna tokens                   |
| `POST` | `/login`    | ❌        | 10/15min   | `{ email, password }`       | Login, retorna access token + refresh cookie   |
| `POST` | `/refresh`  | 🔄 Cookie | 20/15min   | —                           | Rota refresh token, retorna nuevo access token |
| `POST` | `/logout`   | 🔒 JWT    | —          | —                           | Invalida refresh token, limpia cookie          |
| `GET`  | `/profile`  | 🔒 JWT    | —          | —                           | Retorna datos del usuario                      |

### Media (`/api/media`) — Todas requieren 🔒 JWT

| Método   | Ruta        | Query/Body                       | Descripción                                    |
| -------- | ----------- | -------------------------------- | ---------------------------------------------- |
| `GET`    | `/search`   | `?query=&page=1&type=multi`      | Busca en TMDB (movie, tv, multi)               |
| `GET`    | `/list`     | `?status=&mediaType=`            | Lista de media del usuario (filtrable)         |
| `POST`   | `/list`     | `{ tmdbId, mediaType, status? }` | Agrega item a la lista                         |
| `PATCH`  | `/list/:id` | `{ status }`                     | Actualiza estado (to_watch, watching, watched) |
| `DELETE` | `/list/:id` | —                                | Elimina item de la lista                       |

## Flujo de autenticación

```
1. POST /register o /login
   → Passport Local Strategy verifica email + bcrypt
   → Genera Access Token (JWT, 15min) + Refresh Token (JWT, 7 días)
   → Access token en response body, Refresh token en HttpOnly cookie

2. Requests autenticados
   → Header: Authorization: Bearer <access_token>
   → Passport JWT Strategy extrae userId del token

3. Token expirado
   → POST /refresh (cookie automática)
   → Passport JWT Refresh Strategy valida el refresh token en DB
   → Rotación: invalida el viejo, genera nuevo par de tokens

4. POST /logout
   → Elimina refresh token de DB + limpia cookie
```

## Prisma

### Schema (`prisma/schema.prisma`)

| Modelo           | Campos clave                       | Notas                                        |
| ---------------- | ---------------------------------- | -------------------------------------------- |
| **User**         | id, name, email (unique), password | Cascade delete en tokens y media             |
| **RefreshToken** | tokenHash, expiresAt, userId       | Index en userId                              |
| **MediaItem**    | tmdbId, mediaType, title, status   | Unique compound: userId + tmdbId + mediaType |

### Comandos

```bash
yarn db:migrate    # Crear y aplicar migración (recomendado)
yarn db:push       # Push directo sin migración (prototipado)
yarn db:generate   # Regenerar Prisma Client
yarn db:studio     # UI visual para la DB
```

### migrate vs push

|                           | `db:migrate`            | `db:push`          |
| ------------------------- | ----------------------- | ------------------ |
| Crea archivo de migración | ✅                      | ❌                 |
| Historial de cambios      | ✅                      | ❌                 |
| Uso recomendado           | Desarrollo / producción | Prototipado rápido |

## Levantar

```bash
cp .env.example .env   # Configurar credenciales
yarn db:migrate        # Aplicar schema
yarn dev               # http://localhost:3000 (hot reload con tsx)
```

## Build de producción

```bash
yarn build    # prisma generate + tsup → dist/main.js
yarn start    # node dist/main.js
```

## Variables de entorno

| Variable                 | Requerida | Default | Descripción                                  |
| ------------------------ | --------- | ------- | -------------------------------------------- |
| `DATABASE_URL`           | ✅        | —       | Connection string PostgreSQL (con pgbouncer) |
| `DIRECT_URL`             | ✅        | —       | Connection string directa (para migraciones) |
| `JWT_ACCESS_SECRET`      | ✅        | —       | Secret para access tokens                    |
| `JWT_REFRESH_SECRET`     | ✅        | —       | Secret para refresh tokens                   |
| `TMDB_API_KEY`           | ✅        | —       | "API Read Access Token" (v4) de TMDB         |
| `PORT`                   | ❌        | `3000`  | Puerto del servidor                          |
| `CORS_ORIGIN`            | ❌        | `true`  | Origen permitido para CORS                   |
| `JWT_ACCESS_EXPIRES_IN`  | ❌        | `15m`   | Expiración access token                      |
| `JWT_REFRESH_EXPIRES_IN` | ❌        | `7d`    | Expiración refresh token                     |
