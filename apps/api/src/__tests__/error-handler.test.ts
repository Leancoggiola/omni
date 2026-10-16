import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

import { errorHandler } from '../common/utils/error-handler';

function run(err: unknown) {
  const json = vi.fn<(body: Record<string, unknown>) => void>();
  const status = vi.fn<(code: number) => { json: typeof json }>(() => ({ json }));
  errorHandler(err as never, {} as Request, { status } as unknown as Response, vi.fn());
  return { status: status.mock.calls[0]![0], body: json.mock.calls[0]![0] };
}

describe('errorHandler', () => {
  it.each([
    ['P2002', 409],
    ['P2025', 404],
    ['P2003', 400],
    ['P2023', 400],
  ])('traduce el error de Prisma %s a %i', (code, expected) => {
    const { status, body } = run(
      Object.assign(new Error('Prisma internals: Unique constraint on `tokenHash`'), { code })
    );

    expect(status).toBe(expected);
    expect(body.statusCode).toBe(expected);
    expect(body.message).not.toContain('Prisma internals');
  });

  it('deja en 500 un código de Prisma que no está mapeado', () => {
    expect(run(Object.assign(new Error('boom'), { code: 'P1001' })).status).toBe(500);
  });

  it('respeta el status de un error propio aunque traiga un code', () => {
    expect(run({ status: 403, message: 'Prohibido', code: 'P2002' })).toMatchObject({ status: 403 });
  });

  it('conserva el detalle de validación', () => {
    const { status, body } = run({
      status: 400,
      message: 'Error de validación',
      errors: { amount: ['demasiado grande'] },
    });

    expect(status).toBe(400);
    expect(body.errors).toEqual({ amount: ['demasiado grande'] });
  });

  it('responde 500 ante un error desconocido', () => {
    expect(run(new Error('boom')).status).toBe(500);
  });
});
