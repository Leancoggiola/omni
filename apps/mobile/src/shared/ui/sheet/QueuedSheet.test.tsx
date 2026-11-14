import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { getByHostType, queryAllByHostType } from '@/test/hostQueries';
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
  return { open, shown: null, close: jest.fn(), onOpenChange: jest.fn(), onTransition: jest.fn() };
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
  it('va en un Modal propio, visible solo mientras la hoja está abierta', async () => {
    const view = await render(ui(makeQueue(false)));
    expect(queryAllByHostType('Modal')).toHaveLength(0);

    await view.rerender(ui(makeQueue(true)));
    expect(getByHostType('Modal')).toHaveProp('visible', true);
    expect(screen.getByText('Opciones')).toBeTruthy();
  });

  it('oculta el Modal recién después de la animación de salida', async () => {
    const view = await render(ui(makeQueue(true)));

    await view.rerender(ui(makeQueue(false)));
    expect(getByHostType('Modal')).toHaveProp('visible', true);

    await act(() => jest.advanceTimersByTime(SHEET_EXIT_MS));
    expect(queryAllByHostType('Modal')).toHaveLength(0);
  });

  it('no oculta el Modal si se abrió otra request antes de que termine la salida', async () => {
    const view = await render(ui(makeQueue(true)));
    await view.rerender(ui(makeQueue(false)));
    await view.rerender(ui(makeQueue(true)));

    await act(() => jest.advanceTimersByTime(SHEET_EXIT_MS));
    expect(getByHostType('Modal')).toHaveProp('visible', true);
  });

  it('no se puede arrastrar: un toque sobre las opciones no la desplaza', async () => {
    await render(ui(makeQueue(true)));

    expect(mockSheet.props?.disableDrag).toBe(true);
  });

  it('Atrás cancela la request', async () => {
    const queue = makeQueue(true);
    await render(ui(queue));

    await act(() => getByHostType('Modal').props.onRequestClose());

    expect(queue.onOpenChange).toHaveBeenCalledWith(false);
  });
});
