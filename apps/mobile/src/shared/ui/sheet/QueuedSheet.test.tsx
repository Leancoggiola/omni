import { act, render, screen } from '@testing-library/react-native';
import { Modal, Text } from 'react-native';

import { mockSheet } from '@/test/tamaguiMock';

import { QueuedSheet } from './QueuedSheet';
import { SHEET_EXIT_MS, type SheetQueue, type SheetRequest } from './useSheetQueue';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);

function makeQueue(open: boolean): SheetQueue<boolean, SheetRequest<boolean>> {
  return { open, shown: null, close: jest.fn(), onOpenChange: jest.fn(), onAnimationComplete: jest.fn() };
}

function ui(queue: SheetQueue<boolean, SheetRequest<boolean>>) {
  return (
    <QueuedSheet queue={queue}>
      <Text>Opciones</Text>
    </QueuedSheet>
  );
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('QueuedSheet', () => {
  it('va en un Modal propio, visible solo mientras la hoja está abierta', () => {
    const view = render(ui(makeQueue(false)));
    expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);

    view.rerender(ui(makeQueue(true)));
    expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(true);
    expect(screen.getByText('Opciones')).toBeTruthy();
  });

  it('oculta el Modal recién después de la animación de salida', () => {
    const view = render(ui(makeQueue(true)));

    view.rerender(ui(makeQueue(false)));
    expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(true);

    act(() => jest.advanceTimersByTime(SHEET_EXIT_MS));
    expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
  });

  it('no oculta el Modal si se abrió otra request antes de que termine la salida', () => {
    const view = render(ui(makeQueue(true)));
    view.rerender(ui(makeQueue(false)));
    view.rerender(ui(makeQueue(true)));

    act(() => jest.advanceTimersByTime(SHEET_EXIT_MS));
    expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(true);
  });

  it('no se puede arrastrar: un toque sobre las opciones no la desplaza', () => {
    render(ui(makeQueue(true)));

    expect(mockSheet.props?.disableDrag).toBe(true);
  });

  it('Atrás cancela la request', () => {
    const queue = makeQueue(true);
    render(ui(queue));

    act(() => screen.UNSAFE_getByType(Modal).props.onRequestClose());

    expect(queue.onOpenChange).toHaveBeenCalledWith(false);
  });
});
