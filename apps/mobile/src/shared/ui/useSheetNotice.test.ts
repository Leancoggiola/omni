import { act, renderHook } from '@testing-library/react-native';

import { notifySuccess } from './notify/notify';
import { useSheetNotice } from './useSheetNotice';

jest.mock('./notify/notify', () => ({ ...jest.requireActual('./notify/notify'), notifySuccess: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

describe('useSheetNotice', () => {
  it('guarda el aviso y lo muestra recién en flush, una sola vez', async () => {
    const { result } = await renderHook(() => useSheetNotice());

    await act(async () => result.current.queue('Peso guardado'));
    expect(notifySuccess).not.toHaveBeenCalled();

    await act(async () => result.current.flush());
    await act(async () => result.current.flush());
    expect(notifySuccess).toHaveBeenCalledTimes(1);
    expect(notifySuccess).toHaveBeenCalledWith('Peso guardado');
  });

  it('sin aviso pendiente flush no muestra nada', async () => {
    const { result } = await renderHook(() => useSheetNotice());

    await act(async () => result.current.flush());
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('si la pantalla se desmonta con un aviso pendiente, igual lo muestra', async () => {
    const { result, unmount } = await renderHook(() => useSheetNotice());

    await act(async () => result.current.queue('Ejercicio agregado'));
    await unmount();
    expect(notifySuccess).toHaveBeenCalledWith('Ejercicio agregado');
  });
});
