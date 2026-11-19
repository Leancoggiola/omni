import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from './useDebouncedValue';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useDebouncedValue', () => {
  it('devuelve el valor recién cuando deja de cambiar por `delay` ms', async () => {
    const { result, rerender } = await renderHook(({ value }: { value: string }) => useDebouncedValue(value, 250), {
      initialProps: { value: 'a' },
    });
    expect(result.current).toBe('a');

    await rerender({ value: 'ab' });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await rerender({ value: 'abc' });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('a');

    await act(async () => {
      jest.advanceTimersByTime(50);
    });
    expect(result.current).toBe('abc');
  });
});
