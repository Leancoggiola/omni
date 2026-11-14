import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { FormSheet } from './FormSheet';
import { SHEET_EXIT_MS } from './useSheetQueue';

import { getByHostType, queryAllByHostType } from '@/test/hostQueries';
import { mockSheet } from '@/test/tamaguiMock';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);

async function renderSheet(props: { open?: boolean; busy?: boolean } = {}) {
  const onOpenChange = jest.fn();
  const onClosed = jest.fn();
  const view = await render(
    <FormSheet open title="Ingresar código" onOpenChange={onOpenChange} onClosed={onClosed} {...props}>
      <Text>Contenido</Text>
    </FormSheet>
  );
  return { onOpenChange, onClosed, view };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('FormSheet', () => {
  it('muestra el título y el contenido', async () => {
    await renderSheet();

    expect(screen.getByText('Ingresar código')).toBeTruthy();
    expect(screen.getByText('Contenido')).toBeTruthy();
  });

  it('no se puede arrastrar: un toque no la desplaza ni la achica', async () => {
    await renderSheet();

    expect(mockSheet.props?.disableDrag).toBe(true);
  });

  it('el botón de cerrar y Atrás piden cerrar', async () => {
    const { onOpenChange } = await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar' }));
    await act(() => getByHostType('Modal').props.onRequestClose());

    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('con una operación en curso no se puede cerrar', async () => {
    const { onOpenChange } = await renderSheet({ busy: true });

    await act(() => getByHostType('Modal').props.onRequestClose());

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('al cerrar oculta el Modal y avisa onClosed recién tras la salida', async () => {
    const { onClosed, view } = await renderSheet();

    await view.rerender(
      <FormSheet open={false} title="Ingresar código" onOpenChange={jest.fn()} onClosed={onClosed}>
        <Text>Contenido</Text>
      </FormSheet>
    );
    expect(onClosed).not.toHaveBeenCalled();
    expect(getByHostType('Modal')).toHaveProp('visible', true);

    await act(() => jest.advanceTimersByTime(SHEET_EXIT_MS));

    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(queryAllByHostType('Modal')).toHaveLength(0);
  });

  it('onClosed llega una sola vez aunque el padre lo pase nuevo en cada render', async () => {
    const calls = jest.fn();
    const view = await render(
      <FormSheet open title="Ingresar código" onOpenChange={jest.fn()} onClosed={() => calls()}>
        <Text>Contenido</Text>
      </FormSheet>
    );
    const rerenderClosed = async () =>
      await view.rerender(
        <FormSheet open={false} title="Ingresar código" onOpenChange={jest.fn()} onClosed={() => calls()}>
          <Text>Contenido</Text>
        </FormSheet>
      );

    await rerenderClosed();
    await act(() => jest.advanceTimersByTime(SHEET_EXIT_MS - 100));
    await rerenderClosed();
    await act(() => jest.advanceTimersByTime(100));
    await rerenderClosed();
    await act(() => jest.advanceTimersByTime(SHEET_EXIT_MS * 2));

    expect(calls).toHaveBeenCalledTimes(1);
  });

  it('si nunca se abrió no avisa onClosed', async () => {
    const { onClosed } = await renderSheet({ open: false });

    await act(() => jest.advanceTimersByTime(SHEET_EXIT_MS * 2));

    expect(onClosed).not.toHaveBeenCalled();
  });

  it('el teclado no mueve la hoja: la hoja no usa moveOnKeyboardChange', async () => {
    await renderSheet();

    expect(mockSheet.props).not.toHaveProperty('moveOnKeyboardChange');
  });
});
