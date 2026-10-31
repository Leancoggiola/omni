import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Modal, Text } from 'react-native';

import { FormSheet } from './FormSheet';
import { SHEET_EXIT_MS } from './useSheetQueue';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);

function renderSheet(props: { open?: boolean; busy?: boolean } = {}) {
  const onOpenChange = jest.fn();
  const onClosed = jest.fn();
  const view = render(
    <FormSheet open title="Ingresar código" onOpenChange={onOpenChange} onClosed={onClosed} {...props}>
      <Text>Contenido</Text>
    </FormSheet>
  );
  return { onOpenChange, onClosed, view };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('FormSheet', () => {
  it('muestra el título y el contenido', () => {
    renderSheet();

    expect(screen.getByText('Ingresar código')).toBeTruthy();
    expect(screen.getByText('Contenido')).toBeTruthy();
  });

  it('el botón de cerrar y Atrás piden cerrar', () => {
    const { onOpenChange } = renderSheet();

    fireEvent.press(screen.getByRole('button', { name: 'Cerrar' }));
    act(() => screen.UNSAFE_getByType(Modal).props.onRequestClose());

    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('con una operación en curso no se puede cerrar', () => {
    const { onOpenChange } = renderSheet({ busy: true });

    act(() => screen.UNSAFE_getByType(Modal).props.onRequestClose());

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('al cerrar oculta el Modal y avisa onClosed recién tras la salida', () => {
    const { onClosed, view } = renderSheet();

    view.rerender(
      <FormSheet open={false} title="Ingresar código" onOpenChange={jest.fn()} onClosed={onClosed}>
        <Text>Contenido</Text>
      </FormSheet>
    );
    expect(onClosed).not.toHaveBeenCalled();
    expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(true);

    act(() => jest.advanceTimersByTime(SHEET_EXIT_MS));

    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
  });
});
