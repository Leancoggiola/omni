import { act, renderHook } from '@testing-library/react-native';

import { useRevalidateOnFocus } from './useRevalidateOnFocus';

let mockFocused = true;
jest.mock('expo-router/react-navigation', () => ({ useIsFocused: () => mockFocused }));

function setup(revalidate: jest.Mock) {
  return renderHook(() => useRevalidateOnFocus(revalidate));
}

describe('useRevalidateOnFocus', () => {
  beforeEach(() => {
    mockFocused = true;
  });

  it('no revalida al montar con foco ni al montar sin foco', () => {
    const revalidate = jest.fn().mockResolvedValue(undefined);
    setup(revalidate);

    mockFocused = false;
    setup(revalidate);

    expect(revalidate).not.toHaveBeenCalled();
  });

  it('revalida una vez al recuperar el foco, y no al perderlo ni al volver a renderizar', () => {
    const revalidate = jest.fn().mockResolvedValue(undefined);
    const { rerender } = setup(revalidate);

    mockFocused = false;
    rerender({});
    expect(revalidate).not.toHaveBeenCalled();

    mockFocused = true;
    rerender({});
    rerender({});
    expect(revalidate).toHaveBeenCalledTimes(1);
  });

  it('un fallo al revalidar no se propaga', async () => {
    const revalidate = jest.fn().mockRejectedValue(new Error('Sin conexión'));
    mockFocused = false;
    const { rerender } = setup(revalidate);

    mockFocused = true;
    await act(async () => {
      rerender({});
    });

    expect(revalidate).toHaveBeenCalledTimes(1);
  });
});
