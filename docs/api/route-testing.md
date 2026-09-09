# API — tests de integración de rutas

Guía para probar endpoints Express con **Vitest + Supertest contra PostgreSQL real**.

## Por qué cambió el enfoque

Los route tests anteriores mockeaban el service completo (`vi.mock('../../<feature>/<feature>.service')`), así que la lógica de negocio y las queries de Prisma tenían **cobertura cero**. Un bug real —el getter de `req.query` de Express 5 descartaba la coerción de Zod y llegaba a Prisma con `take: "50"`— pasó a producción con toda la suite en verde.

Hoy los tests atraviesan el stack completo: HTTP → passport → `validate()` → service → Prisma → PostgreSQL.

## Dos proyectos de Vitest

| Proyecto      | Archivos                                     | Necesita DB | Qué valida                                                     |
| ------------- | -------------------------------------------- | ----------- | -------------------------------------------------------------- |
| `unit`        | `src/**/*.test.ts` (fuera de `integration/`) | No          | Schemas Zod, utilidades puras, middleware `validate`           |
| `integration` | `src/__tests__/integration/*.test.ts`        | Sí          | Routing, auth real, validación, reglas de negocio, SQL emitido |

```bash
pnpm --filter api test:unit          # rápido, sin Docker
pnpm --filter api test:integration
pnpm --filter api test               # ambos
```

---

## Poner la base de test en marcha

```bash
docker compose up -d db-test      # postgres:17-alpine, puerto 5433, tmpfs (efímero)
pnpm --filter api db:test:reset   # aplica las migraciones
```

La conexión vive en `apps/api/.env.test`, que está **commiteado** porque no contiene secretos reales.

> **Guard de seguridad.** `prisma.config.ts` resuelve `DIRECT_URL ?? DATABASE_URL` después de cargar `.env`, así que un `migrate reset` con el entorno de dev en scope borraría la base de Supabase. `db:test:reset` carga `.env.test` con `override` y aborta si el host no es local o si el nombre de la base no termina en `_test`.

---

## Aislamiento: una transacción por test

`apps/api/src/common/db/prisma.ts` exporta un `Proxy` que delega en la transacción activa cuando hay una, y en el cliente real cuando no. Los services siguen importando `{ prisma }` sin enterarse.

`setupIntegrationDb.ts` abre una transacción antes de cada test y la revierte después. Nada se commitea, así que la base queda idéntica y los tests no dependen del orden.

Consecuencias a tener presentes:

- El override es estado de módulo → el proyecto corre con `fileParallelism: false`.
- Prisma no expone `$transaction` en el cliente transaccional, así que el proxy aplana las llamadas anidadas (lo usa `expenses.service.ts`).
- Un error de base de datos (una violación de constraint, por ejemplo) **aborta la transacción entera**. Para esos casos está `withSavepoint()`.

---

## Helpers

Todos en `apps/api/src/test/integration/`:

| Helper                        | Uso                                                                        |
| ----------------------------- | -------------------------------------------------------------------------- |
| `createIntegrationApp()`      | Express con el stack de `main.ts` menos helmet, CORS, rate limit y logging |
| `authHeader(user)`            | Firma un JWT real que passport valida — no hay middleware mockeado         |
| `toJwtUser(user)`             | Convierte una fila de `User` en el payload del token                       |
| `createUser()`, `create…()`   | Factories determinísticas, sin datos aleatorios                            |
| `findRecordedCall(model, op)` | Devuelve los `args` que recibió Prisma — para assertear el SQL emitido     |
| `withSavepoint(fn)`           | Aísla una request que provoca un error de base de datos                    |

---

## Plantilla

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { prisma } from '../../common/db';
import { authHeader } from '../../test/integration/auth';
import { createIntegrationApp } from '../../test/integration/createIntegrationApp';
import { createUser, toJwtUser } from '../../test/integration/factories';

const app = createIntegrationApp();

describe('<feature> routes (integration)', () => {
  let user: Awaited<ReturnType<typeof createUser>>;
  let auth: string;

  beforeEach(async () => {
    user = await createUser({ username: '<feature>-owner' });
    auth = authHeader(toJwtUser(user));
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/<feature>/...');
    expect(res.status).toBe(401);
  });

  it('POST /... persists the row', async () => {
    const res = await request(app).post('/api/<feature>/...').set('Authorization', auth).send({ name: 'Algo' });

    expect(res.status).toBe(201);
    expect(await prisma.<model>.count({ where: { userId: user.id } })).toBe(1);
  });
});
```

---

## Qué cubrir por endpoint

1. **401** sin `Authorization`.
2. **200/201** happy path, verificando además la **fila persistida**, no solo la respuesta.
3. **400** por `validate()` en body o query.
4. **404 cross-user**: un recurso de otro usuario no debe ser visible ni editable. Esto es lo que los tests mockeados nunca pudieron cubrir.
5. **4xx** de reglas de negocio (`throw { status, message }`).
6. **204** en DELETE, comprobando que la fila desapareció.
7. Si la ruta pagina, assertear con `findRecordedCall` que `take`/`skip` llegan a Prisma como **números**.

## Servicios externos

La base es real; solo se mockea lo que sale a internet. `media` hace `vi.mock('../../media/tmdb.service')` a nivel de archivo.

---

## Referencias

- Ejemplos: `apps/api/src/__tests__/integration/`
- Skill agente: `.github/skills/api-structure/SKILL.md`
- Convenciones por glob: `.github/instructions/api.instructions.md`
