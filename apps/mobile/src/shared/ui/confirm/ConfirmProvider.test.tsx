import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import { confirm, type ConfirmOptions, type ConfirmRequest } from './confirm';
import { ConfirmProvider } from './ConfirmProvider';

import { mockSheet, type SheetProps } from '@/test/tamaguiMock';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

/** Handler que registra el provider: permite encolar requests con un `resolve` espía. */
const mockConfirm: { handler: ((request: ConfirmRequest) => void) | null } = { handler: null };

jest.mock('./confirm', () => {
  const actual = jest.requireActual<typeof import('./confirm')>('./confirm');
  return {
    ...actual,
    registerConfirmHandler: (handler: (request: ConfirmRequest) => void) => {
      mockConfirm.handler = handler;
      return actual.registerConfirmHandler(handler);
    },
  };
});

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);

function sheet(): SheetProps {
  if (!mockSheet.props) throw new Error('El Sheet no se renderizó');
  return mockSheet.props;
}

/** Abre un `confirm()` real y deja registrado con qué valor se resolvió. */
function track(options: Partial<ConfirmOptions> & { title: string }) {
  const state: { result: boolean | undefined } = { result: undefined };
  const promise = confirm({ description: `Descripción de ${options.title}`, ...options });
  promise.then(result => {
    state.result = result;
  });
  return state;
}

/** Encola una request directo en el provider, con un `resolve` espía para contar llamadas. */
function enqueueSpy(title: string) {
  if (!mockConfirm.handler) throw new Error('ConfirmProvider no registró su handler');
  const resolve = jest.fn();
  mockConfirm.handler({
    title,
    description: `Descripción de ${title}`,
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    destructive: true,
    resolve,
  });
  return resolve;
}

/** Deja correr los `.then` de las promesas resueltas. */
const flush = async () => await act(async () => {});

async function closeAnimationDone() {
  await act(() => sheet().onTransition({ phase: 'end', cause: 'close', position: 0, finished: true }));
}

beforeEach(async () => {
  jest.useFakeTimers();
  mockSheet.props = null;
  mockConfirm.handler = null;
  await render(
    <ConfirmProvider>
      <></>
    </ConfirmProvider>
  );
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ConfirmProvider', () => {
  it('muestra dos confirm() seguidos de a uno', async () => {
    let first!: ReturnType<typeof track>;
    let second!: ReturnType<typeof track>;
    await act(() => {
      first = track({ title: 'Primera' });
      second = track({ title: 'Segunda' });
    });

    expect(sheet().open).toBe(true);
    expect(screen.getByText('Primera')).toBeTruthy();
    expect(screen.queryByText('Segunda')).toBeNull();

    await fireEvent.press(screen.getByText('Confirmar'));
    await flush();
    expect(first.result).toBe(true);
    expect(sheet().open).toBe(false);
    expect(screen.queryByText('Segunda')).toBeNull();

    await closeAnimationDone();
    expect(sheet().open).toBe(true);
    expect(screen.getByText('Segunda')).toBeTruthy();

    await fireEvent.press(screen.getByText('Cancelar'));
    await flush();
    expect(second.result).toBe(false);
  });

  it('sin labels usa Confirmar y Cancelar', async () => {
    await act(() => {
      track({ title: 'Borrar' });
    });
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
  });

  it('el botón Atrás de Android cancela (resuelve false) y no navega', async () => {
    const addListener = jest.spyOn(BackHandler, 'addEventListener');
    let state!: ReturnType<typeof track>;
    await act(() => {
      state = track({ title: 'Borrar' });
    });

    const handler = addListener.mock.calls.at(-1)?.[1];
    let handled: boolean | null | undefined;
    await act(() => {
      handled = handler?.({ type: 'hardwareBackPress', timeStamp: 0 });
    });
    await flush();
    expect(handled).toBe(true);
    expect(state.result).toBe(false);
    addListener.mockRestore();
  });

  it('usa los labels personalizados', async () => {
    await act(() => {
      track({ title: 'Borrar', confirmLabel: 'Borrar', cancelLabel: 'Volver' });
    });
    expect(screen.getByRole('button', { name: 'Borrar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeTruthy();
  });

  it('cerrar por overlay resuelve false y avanza la cola', async () => {
    let first!: ReturnType<typeof track>;
    let second!: ReturnType<typeof track>;
    await act(() => {
      first = track({ title: 'Primera' });
      second = track({ title: 'Segunda' });
    });

    await act(() => sheet().onOpenChange(false));
    await flush();
    expect(first.result).toBe(false);

    await closeAnimationDone();
    expect(sheet().open).toBe(true);
    expect(screen.getByText('Segunda')).toBeTruthy();
    expect(second.result).toBeUndefined();
  });

  it('botón y onOpenChange(false) en el mismo tick resuelven una sola vez', async () => {
    let first!: jest.Mock;
    let second!: jest.Mock;
    await act(() => {
      first = enqueueSpy('Primera');
      second = enqueueSpy('Segunda');
    });

    await act(async () => {
      await fireEvent.press(screen.getByText('Confirmar'));
      sheet().onOpenChange(false);
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith(true);

    await closeAnimationDone();
    expect(sheet().open).toBe(true);
    expect(screen.getByText('Segunda')).toBeTruthy();
    expect(second).not.toHaveBeenCalled();
  });

  it('si onTransition no llega, el fallback de 600 ms destraba la cola', async () => {
    await act(() => {
      track({ title: 'Primera' });
      track({ title: 'Segunda' });
    });

    await act(() => sheet().onOpenChange(false));
    expect(sheet().open).toBe(false);

    await act(() => jest.advanceTimersByTime(599));
    expect(sheet().open).toBe(false);
    expect(screen.queryByText('Segunda')).toBeNull();

    await act(() => jest.advanceTimersByTime(1));
    expect(sheet().open).toBe(true);
    expect(screen.getByText('Segunda')).toBeTruthy();
  });

  it('solo el fin de la salida avanza la cola: ni la apertura ni un cierre interrumpido', async () => {
    await act(() => {
      track({ title: 'Primera' });
      track({ title: 'Segunda' });
    });
    await act(() => sheet().onOpenChange(false));

    await act(() => sheet().onTransition({ phase: 'start', cause: 'close', position: 0 }));
    await act(() => sheet().onTransition({ phase: 'end', cause: 'open', position: 0, finished: true }));
    await act(() => sheet().onTransition({ phase: 'end', cause: 'close', position: 0, finished: false }));
    expect(sheet().open).toBe(false);
    expect(screen.queryByText('Segunda')).toBeNull();

    await closeAnimationDone();
    expect(sheet().open).toBe(true);
    expect(screen.getByText('Segunda')).toBeTruthy();
  });

  it('resuelve false las requests abiertas si el provider se desmonta', async () => {
    let first!: ReturnType<typeof track>;
    let second!: ReturnType<typeof track>;
    await act(() => {
      first = track({ title: 'Primera' });
      second = track({ title: 'Segunda' });
    });

    await screen.unmount();
    await flush();
    expect(first.result).toBe(false);
    expect(second.result).toBe(false);
  });
});

describe('confirm', () => {
  it('sin ConfirmProvider montado resuelve false y avisa en dev (mismo criterio que notify*)', async () => {
    await screen.unmount();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(confirm({ title: 'Sin provider', description: '' })).resolves.toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/ConfirmProvider/));
    warn.mockRestore();
  });
});
