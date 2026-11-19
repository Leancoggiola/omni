import { describe, expect, it, vi } from 'vitest';

import { useGymSubmit } from '../hooks/useGymSubmit';

import type { GymSubmitResult } from '../utils/gymSubmit';

import { act, renderHook } from '@testing-library/react';

describe('useGymSubmit', () => {
  it('dos envíos en el mismo tick llaman una sola vez a la API', async () => {
    let finish: (result: GymSubmitResult) => void = () => undefined;
    const onSubmit = vi.fn().mockReturnValue(new Promise<GymSubmitResult>(resolve => (finish = resolve)));
    const { result } = renderHook(() => useGymSubmit<string>(onSubmit));

    await act(async () => {
      void result.current.submit('a');
      void result.current.submit('b');
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(true);

    await act(async () => finish({ status: 'done' }));
    expect(result.current.loading).toBe(false);

    await act(async () => {
      void result.current.submit('c');
    });
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('guarda el mensaje de un conflicto y reset lo limpia', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ status: 'conflict', message: 'El plan ya tiene ese día' });
    const { result } = renderHook(() => useGymSubmit<string>(onSubmit));

    await act(async () => result.current.submit('x'));
    expect(result.current.conflict).toBe('El plan ya tiene ese día');

    act(() => result.current.reset());
    expect(result.current.conflict).toBeNull();
  });
});
