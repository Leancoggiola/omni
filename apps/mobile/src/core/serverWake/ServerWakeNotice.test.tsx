import { act, render, screen } from '@testing-library/react-native';

import { ServerWakeNotice } from './ServerWakeNotice';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 0 }) }));

let emit: (waking: boolean) => void = () => undefined;

jest.mock('@/shared/api', () => ({
  subscribeServerWake: (listener: (waking: boolean) => void) => {
    emit = listener;
    listener(false);
    return () => undefined;
  },
}));

describe('ServerWakeNotice', () => {
  it('no muestra nada con el servidor despierto', () => {
    render(<ServerWakeNotice />);
    expect(screen.queryByTestId('server-wake-notice')).toBeNull();
  });

  it('muestra el aviso mientras despierta y lo quita al terminar', () => {
    render(<ServerWakeNotice />);

    act(() => emit(true));
    expect(screen.getByText('Despertando el servidor, puede tardar hasta un minuto y medio…')).toBeTruthy();

    act(() => emit(false));
    expect(screen.queryByTestId('server-wake-notice')).toBeNull();
  });
});
