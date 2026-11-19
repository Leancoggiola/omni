import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import { actionSheet } from './actionSheet';
import { ActionSheetProvider } from './ActionSheetProvider';

import { mockSheet, type SheetProps } from '@/test/tamaguiMock';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);

const STATUS_OPTIONS = [
  { value: 'to_watch', label: 'Pendiente' },
  { value: 'watching', label: 'Viendo' },
  { value: 'watched', label: 'Vista' },
] as const;

function sheet(): SheetProps {
  if (!mockSheet.props) throw new Error('El Sheet no se renderizó');
  return mockSheet.props;
}

/** Abre un `actionSheet()` real y deja registrado con qué valor se resolvió. */
async function open(title = 'Cambiar estado') {
  const state: { result: string | null | undefined } = { result: undefined };
  await act(() => {
    void actionSheet({ title, options: STATUS_OPTIONS, value: 'watching' }).then(result => {
      state.result = result;
    });
  });
  return state;
}

const flush = async () => await act(async () => {});

beforeEach(async () => {
  jest.useFakeTimers();
  mockSheet.props = null;
  await render(
    <ActionSheetProvider>
      <></>
    </ActionSheetProvider>
  );
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ActionSheetProvider', () => {
  it('muestra el título, las opciones y marca la actual', async () => {
    await open();

    expect(sheet().open).toBe(true);
    expect(screen.getByText('Cambiar estado')).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Viendo', selected: true })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Vista', selected: false })).toBeTruthy();
  });

  it('elegir una opción resuelve su value y cierra', async () => {
    const state = await open();

    await fireEvent.press(screen.getByRole('menuitem', { name: 'Vista' }));
    await flush();
    expect(state.result).toBe('watched');
    expect(sheet().open).toBe(false);
  });

  it('"Cancelar" resuelve null', async () => {
    const state = await open();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    await flush();
    expect(state.result).toBeNull();
  });

  it('cerrar por overlay o gesto resuelve null', async () => {
    const state = await open();

    await act(() => sheet().onOpenChange(false));
    await flush();
    expect(state.result).toBeNull();
  });

  it('el botón Atrás de Android cancela (resuelve null) y no navega', async () => {
    const addListener = jest.spyOn(BackHandler, 'addEventListener');
    const state = await open();

    const handler = addListener.mock.calls.at(-1)?.[1];
    let handled: boolean | null | undefined;
    await act(() => {
      handled = handler?.({ type: 'hardwareBackPress', timeStamp: 0 });
    });
    await flush();
    expect(handled).toBe(true);
    expect(state.result).toBeNull();
    addListener.mockRestore();
  });

  it('si el provider se desmonta con un actionSheet() abierto, resuelve null', async () => {
    const state = await open();

    await screen.unmount();
    await flush();
    expect(state.result).toBeNull();
  });

  it('dos pedidos seguidos se muestran de a uno', async () => {
    const first = await open('Primero');
    const second = await open('Segundo');
    expect(screen.queryByText('Segundo')).toBeNull();

    await fireEvent.press(screen.getByRole('menuitem', { name: 'Pendiente' }));
    await flush();
    expect(first.result).toBe('to_watch');

    await act(() => sheet().onTransition({ phase: 'end', cause: 'close', position: 0, finished: true }));
    expect(screen.getByText('Segundo')).toBeTruthy();
    expect(second.result).toBeUndefined();
  });
});

describe('actionSheet', () => {
  it('sin ActionSheetProvider resuelve null y avisa en dev', async () => {
    await screen.unmount();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(actionSheet({ title: 'Sin provider', options: STATUS_OPTIONS })).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/ActionSheetProvider/));
    warn.mockRestore();
  });

  it('avisa en dev si las opciones repiten value, y no avisa si son únicas', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const reactError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const repeated = [
      { value: 'a', label: 'Uno' },
      { value: 'a', label: 'Otro' },
    ];
    await act(() => {
      void actionSheet({ title: 'Repetidas', options: repeated });
    });
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/Repetidas.*values repetidos/));

    warn.mockClear();
    await act(() => {
      void actionSheet({ title: 'Únicas', options: STATUS_OPTIONS });
    });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    reactError.mockRestore();
  });

  it('una opción deshabilitada no se puede elegir y una destructive sí', async () => {
    const state: { result: string | null | undefined } = { result: undefined };
    await act(() => {
      void actionSheet({
        title: 'Opciones',
        options: [
          { value: 'move', label: 'Mover', disabled: true },
          { value: 'remove', label: 'Quitar', destructive: true },
        ],
      }).then(result => {
        state.result = result;
      });
    });

    await fireEvent.press(screen.getByRole('menuitem', { name: 'Mover' }));
    await flush();
    expect(state.result).toBeUndefined();
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Quitar' }));
    await flush();
    expect(state.result).toBe('remove');
  });
});
