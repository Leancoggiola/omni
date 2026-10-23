import { describe, expect, it } from 'vitest';

import { createUserSchema, ROLE_LABELS, ROLES } from '..';

const base = { username: 'usuario01', name: 'Ana Pérez', password: 'password123' };

describe('ROLES', () => {
  it('lista los roles y todos tienen label', () => {
    expect(ROLES).toEqual(['ADMIN', 'USER']);
    expect(Object.keys(ROLE_LABELS).sort()).toEqual([...ROLES].sort());
  });
});

describe('createUserSchema role', () => {
  it.each(ROLES)('acepta el rol %s', role => {
    expect(createUserSchema.parse({ ...base, role }).role).toBe(role);
  });

  it('es opcional: sin rol queda indefinido y el servicio aplica USER', () => {
    expect(createUserSchema.parse(base).role).toBeUndefined();
  });

  it('rechaza un rol desconocido', () => {
    expect(createUserSchema.safeParse({ ...base, role: 'ROOT' }).success).toBe(false);
  });
});
