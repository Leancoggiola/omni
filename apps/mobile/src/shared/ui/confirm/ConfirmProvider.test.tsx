import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { confirm, type ConfirmOptions, type ConfirmRequest } from './confirm';
import { ConfirmProvider } from './ConfirmProvider';

import { mockSheet, type SheetProps } from '@/test/tamaguiMock';

// El Sheet de Tamagui es un doble que guarda sus props: lo que se prueba es la cola del provider, y
// los cierres por overlay/gesto/animación se disparan llamando a esos callbacks.
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
const flush = () => act(async () => {});

function closeAnimationDone() {
  act(() => sheet().onAnimationComplete({ open: false }));
}

beforeEach(() => {
  jest.useFakeTimers();
  mockSheet.props = null;
  mockConfirm.handler = null;
  render(
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
    act(() => {
      first = track({ title: 'Primera' });
      second = track({ title: 'Segunda' });
    });

    expect(sheet().open).toBe(true);
    expect(screen.getByText('Primera')).toBeTruthy();
    expect(screen.queryByText('Segunda')).toBeNull();

    fireEvent.press(screen.getByText('Confirmar'));
    await flush();
    expect(first.result).toBe(true);
    expect(sheet().open).toBe(false);
    // La segunda espera a que termine la animación de cierre.
    expect(screen.queryByText('Segunda')).toBeNull();

    closeAnimationDone();
    expect(sheet().open).toBe(true);
    expect(screen.getByText('Segunda')).toBeTruthy();

    fireEvent.press(screen.getByText('Cancelar'));
    await flush();
    expect(second.result).toBe(false);
  });

  it('usa los labels por defecto y los personalizados', () => {
    act(() => {
      track({ title: 'Borrar', confirmLabel: 'Borrar', cancelLabel: 'Volver' });
    });
    expect(screen.getByRole('button', { name: 'Borrar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeTruthy();
  });

  it('cerrar por overlay resuelve false y avanza la cola', async () => {
    let first!: ReturnType<typeof track>;
    let second!: ReturnType<typeof track>;
    act(() => {
      first = track({ title: 'Primera' });
      second = track({ title: 'Segunda' });
    });

    act(() => sheet().onOpenChange(false));
    await flush();
    expect(first.result).toBe(false);

    closeAnimationDone();
    expect(sheet().open).toBe(true);
    expect(screen.getByText('Segunda')).toBeTruthy();
    expect(second.result).toBeUndefined();
  });

  it('botón y onOpenChange(false) en el mismo tick resuelven una sola vez', () => {
    let first!: jest.Mock;
    let second!: jest.Mock;
    act(() => {
      first = enqueueSpy('Primera');
      second = enqueueSpy('Segunda');
    });

    act(() => {
      fireEvent.press(screen.getByText('Confirmar'));
      sheet().onOpenChange(false);
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith(true);

    // El cierre duplicado no se "come" la siguiente request.
    closeAnimationDone();
    expect(sheet().open).toBe(true);
    expect(screen.getByText('Segunda')).toBeTruthy();
    expect(second).not.toHaveBeenCalled();
  });

  it('si onAnimationComplete no llega, el fallback de 600 ms destraba la cola', () => {
    act(() => {
      track({ title: 'Primera' });
      track({ title: 'Segunda' });
    });

    act(() => sheet().onOpenChange(false));
    expect(sheet().open).toBe(false);

    act(() => jest.advanceTimersByTime(599));
    expect(sheet().open).toBe(false);
    expect(screen.queryByText('Segunda')).toBeNull();

    act(() => jest.advanceTimersByTime(1));
    expect(sheet().open).toBe(true);
    expect(screen.getByText('Segunda')).toBeTruthy();
  });

  it('resuelve false las requests abiertas si el provider se desmonta', async () => {
    let first!: ReturnType<typeof track>;
    let second!: ReturnType<typeof track>;
    act(() => {
      first = track({ title: 'Primera' });
      second = track({ title: 'Segunda' });
    });

    screen.unmount();
    await flush();
    expect(first.result).toBe(false);
    expect(second.result).toBe(false);
  });
});

describe('confirm', () => {
  it('sin ConfirmProvider montado resuelve false y avisa en dev (mismo criterio que notify*)', async () => {
    screen.unmount();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(confirm({ title: 'Sin provider', description: '' })).resolves.toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/ConfirmProvider/));
    warn.mockRestore();
  });
});
