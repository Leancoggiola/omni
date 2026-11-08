# Foto de perfil (#39)

La foto se sube **a la API** (multipart) y la API la guarda en **Supabase Storage** con la service key. Los clientes nunca hablan con Storage ni conocen ninguna key: lo único que reciben es la URL pública que queda en `User.avatarUrl` (ya viaja en `UserProfile`, en el hogar y en el listado de admin).

## Endpoints

| Método y ruta              | Body                                       | Respuesta                                    |
| -------------------------- | ------------------------------------------ | -------------------------------------------- |
| `PUT /api/users/avatar`    | `multipart/form-data`, un archivo `avatar` | `{ user }`: el perfil, como `PATCH /profile` |
| `DELETE /api/users/avatar` | —                                          | `{ user }` con `avatarUrl: null`             |

Ambos usan `authenticateJwt` (cookie o Bearer) y un rate limiter propio (10 por 15 min, compartido entre los dos). `PATCH /api/users/profile` sigue siendo `.strict()` y no acepta `avatarUrl`: la única forma de cambiarlo es esta ruta.

Contrato en `@omni/shared/users`: `AVATAR_FIELD` (`avatar`), `AVATAR_MAX_BYTES` (2 MB), `AVATAR_ALLOWED_MIME` (`image/jpeg`, `image/png`, `image/webp`; sin GIF), `isAvatarMime` y `avatarResponseSchema`. La URL de la ruta es `API_PATHS.users.avatar`.

| Caso                                                                 | Status |
| -------------------------------------------------------------------- | ------ |
| Sin sesión                                                           | 401    |
| Sin archivo, archivo en otro campo, campos de texto o multipart roto | 400    |
| Más de 2 MB                                                          | 413    |
| Los bytes no son JPEG, PNG ni WebP (GIF, SVG, texto, ejecutables…)   | 415    |
| Demasiados cambios                                                   | 429    |
| Falla Supabase Storage al subir                                      | 502    |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` sin definir             | 503    |

## Reglas

- **El formato se decide por los bytes** (`users/avatar-image.ts`), no por el `Content-Type` del part ni por el nombre del archivo, que los elige el cliente. El objeto se guarda con el content type que sale de esa detección. Solo se mira la firma; la imagen no se decodifica ni se reescribe.
- **El upload se corta en 2 MB**: `multer` con `memoryStorage` y `limits.fileSize`, así que nunca se bufferea más que eso. Corre después de la auth y del rate limiter.
- **Cada subida usa un path nuevo**, `<userId>/<uuid>.<jpg|png|webp>`, con `cacheControl` de un año: la URL cambia con la foto y ningún caché sirve la vieja.
- **Reemplazar**: se sube el objeto nuevo, se guarda la URL en la base y recién entonces se borra el anterior. Si la base falla, se borra el recién subido y la foto anterior queda intacta. Si falla el borrado del anterior, el cambio igual se completa (queda un huérfano y se loguea un warning).
- **Borrar** (`DELETE`) y **borrar la cuenta** (propia o desde admin) eliminan el objeto. Sin foto, `DELETE` es un no-op.
- **Solo se borran objetos propios**: la URL tiene que ser de este bucket y colgar de la carpeta `<userId>/`. Una URL externa o ajena se ignora.
- Dos `PUT` simultáneos del mismo usuario pueden dejar un objeto huérfano; el rate limiter lo acota y no afecta lo que ve el usuario.

## Setup del bucket (manual, una vez por proyecto de Supabase)

La API **no crea el bucket ni toca la infraestructura**: hay que crearlo a mano en cada proyecto (`omni-dev` y `omni-prod` son proyectos distintos y cada uno necesita el suyo).

1. [Supabase Dashboard](https://supabase.com/dashboard) → el proyecto → **Storage → New bucket**.
2. Nombre `avatars` (o el que se defina en `SUPABASE_AVATARS_BUCKET`).
3. **Public bucket: activado.** Es lo que permite que `<img src>` y las apps lean la foto sin firmar nada.
4. Como defensa en profundidad, **File size limit** `2 MB` y **Allowed MIME types** `image/jpeg, image/png, image/webp`.

Equivalente en el SQL Editor (no es una migración de Prisma y no va en `apps/api/prisma/migrations/`: `prisma migrate deploy` corre en cada deploy y el schema `storage` no existe en las bases de test):

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
```

### Policies

**No hacen falta.** La lectura de un bucket público por URL no pasa por RLS, y la API escribe y borra con la service key, que se saltea RLS. Dejar `storage.objects` sin policies para `anon` y `authenticated` es lo deseado: así nadie puede listar, subir ni borrar objetos con la anon key. No agregar policies de `INSERT`/`UPDATE`/`DELETE`.

## Variables de entorno

| Variable                    | Dónde                   | Descripción                                                                                                                 |
| --------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | `apps/api/.env`, Render | URL del proyecto (`https://<ref>.supabase.co`): Dashboard → Project Settings → API.                                         |
| `SUPABASE_SERVICE_ROLE_KEY` | `apps/api/.env`, Render | Service role key del mismo proyecto. **Se saltea RLS**: solo servidor, nunca en un cliente, un `.env` commiteado ni un log. |
| `SUPABASE_AVATARS_BUCKET`   | Opcional                | Nombre del bucket. Default: `avatars`.                                                                                      |

Van **juntas o ninguna**: con una sola, la API no arranca. Sin ninguna arranca igual (dev, tests y E2E no las necesitan) y `PUT /api/users/avatar` responde 503; en producción se loguea un warning al arrancar.

En **Render** (servicio `omni-api`, ver [deployment.md](../ops/deployment.md#render-env-vars-sync-false)) cargar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del proyecto `omni-prod`, y `SUPABASE_AVATARS_BUCKET` solo si el bucket no se llama `avatars`. Guardar con **Save only**, igual que el resto. No hay nada que cambiar en Vercel: la web sube a `/api/users/avatar`, que el proxy ya reenvía.

## Código

| Pieza                              | Rol                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `common/storage/avatar-storage.ts` | Interfaz `AvatarStorage` (`upload`, `remove`, `pathFromUrl`) y el adaptador de Supabase.                                 |
| `common/storage/index.ts`          | `getAvatarStorage()`: cliente de Supabase (una sola vez) o 503; `setAvatarStorageOverride()` para tests.                 |
| `users/avatar-upload.ts`           | Middleware `multer` y traducción de sus errores (413 / 400).                                                             |
| `users/avatar-image.ts`            | `detectAvatarImage`: JPEG / PNG / WebP por magic bytes.                                                                  |
| `users/avatar.service.ts`          | `replaceAvatar`, `removeAvatar` y `discardAvatarObject` (borrado tolerante a fallos, usado también al borrar la cuenta). |

## Tests

El storage es lo único que sale a internet, así que la suite lo reemplaza con `createFakeAvatarStorage()` (`src/test/integration/fakeAvatarStorage.ts`, en memoria) vía `setAvatarStorageOverride`, igual que `setPrismaOverride` con la base. Cubren: tope de tamaño, content type falso con bytes inválidos, GIF y SVG, sin auth, reemplazo que borra el anterior, fallos del storage y de la base, `DELETE` y borrado de cuenta. El adaptador de Supabase se prueba con un cliente stub (`avatar-storage.test.ts`).

**Sin probar contra Supabase real**: la subida real depende del bucket y las keys de cada proyecto. Con el bucket creado y las variables cargadas, la prueba manual es:

```bash
curl -i -X PUT http://localhost:3000/api/users/avatar \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "avatar=@foto.png"
```

La respuesta trae `user.avatarUrl`; abrir esa URL tiene que mostrar la imagen, y un segundo `PUT` tiene que dejar un solo objeto en `avatars/<userId>/`.

## Para los clientes

- Mandar `FormData` con el archivo en el campo `AVATAR_FIELD`. Los clientes HTTP de `createApiClient` fijan `Content-Type: application/json`: en este request **no** hay que ponerlo (el navegador y React Native agregan el `boundary` solos) ni serializar el body a JSON.
- Validar antes de subir con `AVATAR_MAX_BYTES` e `isAvatarMime`; la API vuelve a validar por los bytes.
- La respuesta es el perfil completo: reemplaza la caché de `users.profile` sin otro request. La foto del hogar (`HouseholdCard`, `useItemAuthor`) y la de admin se actualizan al revalidar.
- La CSP de `apps/web/vercel.json` limita `img-src` a `'self' data: blob: https://image.tmdb.org`: para mostrar la foto hay que agregar el host de Supabase (`https://<ref>.supabase.co`).
