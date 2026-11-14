import { act, renderHook } from '@testing-library/react-native';

import { useRevalidateOnFocus } from './useRevalidateOnFocus';

let mockFocused = true;
jest.mock('expo-router/react-navigation', () => ({ useIsFocused: () => mockFocused }));

async function setup(revalidate: jest.Mock) {
  return await renderHook(() => useRevalidateOnFocus(revalidate));
}

describe('useRevalidateOnFocus', () => {
  beforeEach(() => {
    mockFocused = true;
  });

  it('no revalida al montar con foco ni al montar sin foco', async () => {
    const revalidate = jest.fn().mockResolvedValue(undefined);
    await setup(revalidate);

    mockFocused = false;
    await setup(revalidate);

    expect(revalidate).not.toHaveBeenCalled();
  });

  it('revalida una vez al recuperar el foco, y no al perderlo ni al volver a renderizar', async () => {
    const revalidate = jest.fn().mockResolvedValue(undefined);
    const { rerender } = await setup(revalidate);

    mockFocused = false;
    await rerender({});
    expect(revalidate).not.toHaveBeenCalled();

    mockFocused = true;
    await rerender({});
    await rerender({});
    expect(revalidate).toHaveBeenCalledTimes(1);
  });

  it('un fallo al revalidar no se propaga', async () => {
    const revalidate = jest.fn().mockRejectedValue(new Error('Sin conexión'));
    mockFocused = false;
    const { rerender } = await setup(revalidate);

    mockFocused = true;
    await act(async () => {
      await rerender({});
    });

    expect(revalidate).toHaveBeenCalledTimes(1);
  });
});
