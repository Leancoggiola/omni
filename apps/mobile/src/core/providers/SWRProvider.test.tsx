import { act, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import type { FC, PropsWithChildren } from 'react';
import { AppState, Text, type AppStateStatus } from 'react-native';
import useSWR from 'swr';
import useSWRImmutable from 'swr/immutable';

import { ApiError } from '@omni/shared/api';

import { initAppStateFocus, SWRProvider } from './SWRProvider';

type Listener = (state: AppStateStatus) => void;

describe('initAppStateFocus', () => {
  let listener: Listener | undefined;
  const remove = jest.fn();

  beforeEach(() => {
    listener = undefined;
    remove.mockReset();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      listener = handler as Listener;
      return { remove } as ReturnType<typeof AppState.addEventListener>;
    });
    Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('avisa al volver de background o inactive a active, y no entre estados que no son active', () => {
    const callback = jest.fn();
    initAppStateFocus(callback);

    listener?.('background');
    expect(callback).not.toHaveBeenCalled();
    listener?.('active');
    expect(callback).toHaveBeenCalledTimes(1);

    listener?.('inactive');
    listener?.('active');
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('no avisa si ya estaba activa', () => {
    const callback = jest.fn();
    initAppStateFocus(callback);

    listener?.('active');
    expect(callback).not.toHaveBeenCalled();
  });

  it('devuelve la función que desuscribe', () => {
    const unsubscribe = initAppStateFocus(jest.fn());
    unsubscribe();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe('SWRProvider', () => {
  let listener: Listener | undefined;
  let cache = new Map();
  const Wrapper: FC<PropsWithChildren> = ({ children }) => <SWRProvider store={cache}>{children}</SWRProvider>;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new Map();
    listener = undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      listener = handler as Listener;
      return { remove: jest.fn() } as ReturnType<typeof AppState.addEventListener>;
    });
    Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const goBackgroundAndReturn = async () => {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10_000);
      listener?.('background');
      listener?.('active');
    });
  };

  it('un useSWR revalida al volver a primer plano; uno immutable no', async () => {
    const listFetcher = jest.fn().mockResolvedValue(['a']);
    const profileFetcher = jest.fn().mockResolvedValue({ name: 'Ana' });
    const { result } = renderHook(
      () => ({
        list: useSWR('/api/lista', listFetcher),
        profile: useSWRImmutable('/api/perfil', profileFetcher),
      }),
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(result.current.list.data).toEqual(['a']));
    await waitFor(() => expect(result.current.profile.data).toEqual({ name: 'Ana' }));

    await goBackgroundAndReturn();

    await waitFor(() => expect(listFetcher).toHaveBeenCalledTimes(2));
    expect(profileFetcher).toHaveBeenCalledTimes(1);
  });

  it('conserva la caché si se vuelve a montar (expo-router remonta el layout raíz al redirigir)', async () => {
    const fetcherMock = jest.fn().mockResolvedValue({ user: 'ana' });
    const first = renderHook(() => useSWRImmutable('/api/sesion', fetcherMock), { wrapper: SWRProvider });
    await waitFor(() => expect(first.result.current.data).toEqual({ user: 'ana' }));
    first.unmount();

    const second = renderHook(() => useSWRImmutable('/api/sesion', fetcherMock), { wrapper: SWRProvider });

    expect(second.result.current.data).toEqual({ user: 'ana' });
    expect(fetcherMock).toHaveBeenCalledTimes(1);
  });

  it('sigue andando si el árbol se vuelve a montar con otra key (el nuevo se monta antes de desmontar el viejo)', async () => {
    const fetcherMock = jest.fn().mockResolvedValue('Ana');
    const Name = () => {
      const { data } = useSWRImmutable<string>('/api/nombre', fetcherMock);
      return <Text>{data ?? 'cargando'}</Text>;
    };
    const Root = ({ generation }: { generation: number }) => (
      <SWRProvider key={generation} store={cache}>
        <Name />
      </SWRProvider>
    );
    const { rerender } = render(<Root generation={1} />);
    expect(await screen.findByText('Ana')).toBeTruthy();

    rerender(<Root generation={2} />);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });
    rerender(<Root generation={2} />);

    expect(screen.getByText('Ana')).toBeTruthy();
    expect(fetcherMock).toHaveBeenCalledTimes(1);
  });

  it('reintenta un 429 y no otros 4xx', async () => {
    let throttled = 0;
    const throttledFetcher = jest.fn(async () => {
      if (++throttled === 1) throw new ApiError('Demasiados intentos', 429);
      return { ok: true };
    });
    const missingFetcher = jest.fn(async () => {
      throw new ApiError('No existe', 404);
    });
    const { result } = renderHook(
      () => ({
        throttled: useSWR('/api/probe-429', throttledFetcher),
        missing: useSWR('/api/probe-404', missingFetcher),
      }),
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(result.current.throttled.error).toBeDefined());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(60_000);
    });

    expect(result.current.throttled.data).toEqual({ ok: true });
    expect(throttledFetcher).toHaveBeenCalledTimes(2);
    expect(missingFetcher).toHaveBeenCalledTimes(1);
  });
});
