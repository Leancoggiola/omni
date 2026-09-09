# API — tests de rutas HTTP

Guía para probar endpoints Express con **Vitest + Supertest**. Patrón usado en lifestyle (gym, pantry, expenses, split-expenses, notifications).

## Dos capas de tests (complementarias)

| Capa           | Archivo típico                                  | Qué valida                                                                                                                                                     | Qué **no** valida                                                       |
| -------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Rutas HTTP** | `src/__tests__/routes/<feature>.routes.test.ts` | Path montado, método HTTP, status code, auth 401, body/query inválido → 400, errores del service → 4xx, que el handler llame al service con `userId` + payload | Queries Prisma, reglas de negocio dentro del service, constraints de BD |
| **Unitarios**  | `src/__tests__/*.test.ts`                       | Schemas Zod, utilidades puras (`settlements`, `pantryAlerts`, fechas), middleware `validate`                                                                   | Que Express enrute bien                                                 |

**Analogía:** los tests de rutas verifican que la **puerta** funciona (auth, validación, códigos HTTP, cableado route → service). Los unitarios verifican la **lógica interna** del service/utils. Los tests de rutas **mockean el service** a propósito: no necesitan PostgreSQL y corren en CI sin base de datos.

Si necesitás probar Prisma + reglas juntas, eso sería una tercera capa (e2e con test DB / containers) — fuera del alcance actual del repo.

---

## Infraestructura compartida

```
apps/api/src/
  test/
    setupEnv.ts           # env mínimo (Vitest setupFiles)
    setupAuthMocks.ts     # mock JWT + notifications auth
    constants.ts          # TEST_USER, AUTH_HEADER
    createTestApp.ts      # Express + /api router + errorHandler
    fixtures/             # respuestas JSON de ejemplo por dominio
  __tests__/
    routes/
      <feature>.routes.test.ts
```

Configurado en `vitest.config.ts`:

```ts
setupFiles: ['src/test/setupEnv.ts', 'src/test/setupAuthMocks.ts'],
```

**No importar `main.ts`** en tests (arranca servidor y conecta BD).

---

## Checklist — nuevo feature con rutas

1. **Schemas / utils** → tests unitarios en `src/__tests__/` si hay lógica no trivial.
2. **Service mockeado** → `vi.mock('../../<feature>/<feature>.service')`.
3. **Archivo de rutas** → `src/__tests__/routes/<feature>.routes.test.ts`.
4. **Fixtures** → tipos alineados con `@omni/shared/<domain>` en `src/test/fixtures/`.
5. **Registrar ruta** en `router.ts` (el test usa el router completo).
6. Correr `pnpm --filter api test`.

---

## Plantilla — `*.routes.test.ts`

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { createTestApp } from '../../test/createTestApp';
import { AUTH_HEADER, TEST_USER } from '../../test/constants';
import * as featureService from '../../<feature>/<feature>.service';

vi.mock('../../<feature>/<feature>.service');

const mocked = vi.mocked(featureService);

describe('<feature> routes', () => {
  const app = createTestApp();

  beforeEach(() => {
    vi.clearAllMocks();
    // defaults por endpoint — evita undefined en handlers
    mocked.listSomething.mockResolvedValue([]);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/<feature>/...');
    expect(res.status).toBe(401);
  });

  it('GET /... returns data and calls service', async () => {
    const res = await request(app).get('/api/<feature>/...').set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(mocked.listSomething).toHaveBeenCalledWith(TEST_USER.userId, expect.any(Object));
  });

  it('POST /... rejects invalid body', async () => {
    const res = await request(app).post('/api/<feature>/...').set('Authorization', AUTH_HEADER).send({ invalid: true });

    expect(res.status).toBe(400);
    expect(mocked.createSomething).not.toHaveBeenCalled();
  });

  it('propagates service errors with status', async () => {
    mocked.getSomething.mockRejectedValue({ status: 404, message: 'No encontrado' });

    const res = await request(app).get('/api/<feature>/missing').set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('No encontrado');
  });

  it('DELETE /... returns 204', async () => {
    const res = await request(app).delete('/api/<feature>/id-1').set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });
});
```

---

## Auth en tests

- Header válido: `AUTH_HEADER` (`Bearer test-token`) definido en `src/test/constants.ts`.
- Mock global en `setupAuthMocks.ts` inyecta `TEST_USER` en `req.user`.
- Notifications digest: mismo mock acepta `Bearer omni_pi_test-token` para simular Pi.
- **No** generar JWT real ni tocar Passport en tests de rutas.

---

## Qué cubrir por endpoint

Mínimo por ruta protegida:

1. **401** sin `Authorization`
2. **200/201** happy path + service llamado con `TEST_USER.userId`
3. **400** si hay `validate()` en body/query
4. **204** en DELETE lifestyle
5. **4xx** propagado desde `throw { status, message }` del service (ej. 404, 409)

Opcional: query params obligatorios (ej. `month=YYYY-MM` en expenses).

---

## Comandos

```bash
pnpm --filter api test
pnpm --filter api test:watch
pnpm --filter api test:coverage
```

---

## Referencias

- Ejemplos: `apps/api/src/__tests__/routes/`
- Skill agente: `.github/skills/api-structure/SKILL.md`
- Convenciones por glob: `.github/instructions/api.instructions.md`
