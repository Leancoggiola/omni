import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { notifyError } from '@/shared/ui';

import { PreferencesCard } from './PreferencesCard';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('@/shared/ui', () => ({
  ...jest.requireActual('@/shared/ui'),
  notifyError: jest.fn(),
}));

const VALUES = { notifications: false, theme: 'light' } as const;

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PreferencesCard', () => {
  it('tras guardar con éxito conserva el valor nuevo cuando el padre ya lo refleja', async () => {
    const onChange = jest.fn().mockResolvedValue(undefined);
    const { rerender } = render(<PreferencesCard values={VALUES} onChange={onChange} />);

    await act(async () => fireEvent.press(screen.getByRole('radio', { name: 'Oscuro' })));
    rerender(<PreferencesCard values={{ ...VALUES, theme: 'dark' }} onChange={onChange} />);

    expect(onChange).toHaveBeenCalledWith({ theme: 'dark' });
    expect(screen.getByRole('radio', { name: 'Oscuro', checked: true })).toBeTruthy();
  });

  it('si el padre no llega a reflejar el valor, la card vuelve al anterior (no inventa un guardado)', async () => {
    const onChange = jest.fn().mockResolvedValue(undefined);
    render(<PreferencesCard values={VALUES} onChange={onChange} />);

    await act(async () => fireEvent.press(screen.getByRole('radio', { name: 'Oscuro' })));

    expect(screen.getByRole('radio', { name: 'Claro', checked: true })).toBeTruthy();
  });

  it('dos preferencias distintas pueden guardarse a la vez, cada una con su PATCH', async () => {
    const theme = deferred();
    const notifications = deferred();
    const onChange = jest.fn().mockReturnValueOnce(theme.promise).mockReturnValueOnce(notifications.promise);
    render(<PreferencesCard values={VALUES} onChange={onChange} />);

    fireEvent.press(screen.getByRole('radio', { name: 'Oscuro' }));
    fireEvent.press(screen.getByRole('switch', { name: 'Notificaciones' }));

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenNthCalledWith(1, { theme: 'dark' });
    expect(onChange).toHaveBeenNthCalledWith(2, { notifications: true });

    await act(async () => theme.reject(new Error('No hay red')));
    expect(screen.getByRole('radio', { name: 'Claro', checked: true })).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Notificaciones' })).toHaveProp('accessibilityState', {
      checked: true,
      disabled: false,
    });
    expect(notifyError).toHaveBeenCalledWith('No hay red');

    await act(async () => notifications.resolve());
  });
});
