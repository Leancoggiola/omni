import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { notifyError } from '@/shared/ui';

import { SecurityCard } from './SecurityCard';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('@/shared/ui', () => ({ ...jest.requireActual('@/shared/ui'), notifyError: jest.fn() }));

const mockEnable = jest.fn();
const mockDisable = jest.fn();
const mockBiometrics = { available: true, enabled: false, noun: 'huella' };

jest.mock('@/core/biometrics', () => ({
  useBiometrics: () => ({ ...mockBiometrics, enable: mockEnable, disable: mockDisable }),
}));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => (resolve = res));
  return { promise, resolve };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockEnable.mockResolvedValue('success');
  mockDisable.mockResolvedValue(undefined);
  Object.assign(mockBiometrics, { available: true, enabled: false, noun: 'huella' });
});

describe('SecurityCard', () => {
  it('si el teléfono no tiene biometría no muestra nada', () => {
    mockBiometrics.available = false;
    render(<SecurityCard />);

    expect(screen.queryByText('Seguridad')).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('muestra el toggle con el texto de huella, apagado', () => {
    render(<SecurityCard />);

    expect(screen.getByText('Seguridad')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Ingresar con huella', checked: false })).toBeTruthy();
  });

  it('adapta los textos al rostro', () => {
    mockBiometrics.noun = 'rostro';
    render(<SecurityCard />);

    expect(screen.getByRole('switch', { name: 'Ingresar con rostro' })).toBeTruthy();
    expect(screen.getByText(/Pedir tu rostro al abrir Omni/)).toBeTruthy();
  });

  it('refleja la preferencia activada', () => {
    mockBiometrics.enabled = true;
    render(<SecurityCard />);

    expect(screen.getByRole('switch', { name: 'Ingresar con huella', checked: true })).toBeTruthy();
  });

  it('activar pide la verificación (enable) y no avisa si sale bien', async () => {
    render(<SecurityCard />);
    await act(async () => fireEvent.press(screen.getByRole('switch', { name: 'Ingresar con huella' })));

    expect(mockEnable).toHaveBeenCalledTimes(1);
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('muestra el valor nuevo mientras se verifica y vuelve a apagado si se cancela, sin avisar', async () => {
    const pending = deferred<string>();
    mockEnable.mockReturnValue(pending.promise);
    render(<SecurityCard />);
    fireEvent.press(screen.getByRole('switch', { name: 'Ingresar con huella' }));

    expect(screen.getByRole('switch', { name: 'Ingresar con huella', checked: true })).toBeTruthy();

    await act(async () => pending.resolve('cancelled'));
    expect(screen.getByRole('switch', { name: 'Ingresar con huella', checked: false })).toBeTruthy();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('si la verificación falla vuelve a apagado y avisa', async () => {
    mockEnable.mockResolvedValue('failed');
    render(<SecurityCard />);
    await act(async () => fireEvent.press(screen.getByRole('switch', { name: 'Ingresar con huella' })));

    expect(notifyError).toHaveBeenCalledWith('No se pudo verificar tu huella. No se activó el ingreso.');
    expect(screen.getByRole('switch', { name: 'Ingresar con huella', checked: false })).toBeTruthy();
  });

  it('ignora un segundo toque mientras hay una verificación en vuelo', async () => {
    const pending = deferred<string>();
    mockEnable.mockReturnValue(pending.promise);
    render(<SecurityCard />);
    fireEvent.press(screen.getByRole('switch', { name: 'Ingresar con huella' }));
    fireEvent.press(screen.getByRole('switch', { name: 'Ingresar con huella' }));

    expect(mockEnable).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve('success'));
  });

  it('desactivar no pide verificación', async () => {
    mockBiometrics.enabled = true;
    render(<SecurityCard />);
    await act(async () => fireEvent.press(screen.getByRole('switch', { name: 'Ingresar con huella' })));

    expect(mockDisable).toHaveBeenCalledTimes(1);
    expect(mockEnable).not.toHaveBeenCalled();
  });

  it('si no se puede guardar al desactivar, vuelve a encendido y avisa', async () => {
    mockBiometrics.enabled = true;
    mockDisable.mockRejectedValue(new Error('SecureStore'));
    render(<SecurityCard />);
    await act(async () => fireEvent.press(screen.getByRole('switch', { name: 'Ingresar con huella' })));

    expect(notifyError).toHaveBeenCalledWith('No se pudo guardar la preferencia');
    expect(screen.getByRole('switch', { name: 'Ingresar con huella', checked: true })).toBeTruthy();
  });
});
