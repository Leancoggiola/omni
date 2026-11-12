import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { notifyError } from '@/shared/ui';

import { SensitiveGate } from './SensitiveGate';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('@/shared/ui', () => ({ ...jest.requireActual('@/shared/ui'), notifyError: jest.fn() }));

const mockAuthenticateSensitive = jest.fn();
const mockIsSensitiveUnlocked = jest.fn();
const mockBiometrics = {
  enabled: true,
  kind: 'fingerprint',
  noun: 'huella',
  sensitiveEpoch: 0,
};

jest.mock('./BiometricsContext', () => ({
  useBiometrics: () => ({
    ...mockBiometrics,
    isSensitiveUnlocked: mockIsSensitiveUnlocked,
    authenticateSensitive: mockAuthenticateSensitive,
  }),
}));

const renderGate = (props: Partial<React.ComponentProps<typeof SensitiveGate>> = {}) =>
  render(
    <SensitiveGate module="expenses" {...props}>
      <Text>contenido de gastos</Text>
    </SensitiveGate>
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthenticateSensitive.mockResolvedValue('success');
  mockIsSensitiveUnlocked.mockReturnValue(false);
  Object.assign(mockBiometrics, { enabled: true, kind: 'fingerprint', noun: 'huella', sensitiveEpoch: 0 });
});

describe('SensitiveGate', () => {
  it('en un módulo sensible sin desbloqueo vigente tapa el contenido y ofrece desbloquear', () => {
    renderGate();

    expect(screen.queryByText('contenido de gastos')).toBeNull();
    expect(screen.getByText('Módulo protegido')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Gastos' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Desbloquear con huella' })).toBeTruthy();
  });

  it('adapta los textos al rostro', () => {
    Object.assign(mockBiometrics, { kind: 'face', noun: 'rostro' });
    renderGate();

    expect(screen.getByRole('button', { name: 'Desbloquear con rostro' })).toBeTruthy();
    expect(screen.getByText('Verificá tu rostro para ver esta información.')).toBeTruthy();
  });

  it('con un desbloqueo vigente muestra el contenido sin pedir nada', () => {
    mockIsSensitiveUnlocked.mockReturnValue(true);
    renderGate();

    expect(screen.getByText('contenido de gastos')).toBeTruthy();
    expect(mockAuthenticateSensitive).not.toHaveBeenCalled();
  });

  it('un módulo que no es sensible pasa derecho', () => {
    renderGate({ module: 'pantry' });

    expect(screen.getByText('contenido de gastos')).toBeTruthy();
  });

  it('sin la biometría activada (o sin biometría en el teléfono) no muestra nada del gate', () => {
    mockBiometrics.enabled = false;
    renderGate();

    expect(screen.getByText('contenido de gastos')).toBeTruthy();
    expect(screen.queryByText('Módulo protegido')).toBeNull();
  });

  it('al desbloquear con éxito muestra el contenido', async () => {
    renderGate();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Desbloquear con huella' })));

    expect(mockAuthenticateSensitive).toHaveBeenCalledTimes(1);
    expect(screen.getByText('contenido de gastos')).toBeTruthy();
  });

  it('si se cancela no avisa nada y queda el botón para reintentar', async () => {
    mockAuthenticateSensitive.mockResolvedValue('cancelled');
    renderGate();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Desbloquear con huella' })));

    expect(notifyError).not.toHaveBeenCalled();
    expect(screen.queryByText('contenido de gastos')).toBeNull();
    expect(screen.getByRole('button', { name: 'Desbloquear con huella', busy: false })).toBeTruthy();
  });

  it('si falla avisa, sigue tapado y se puede reintentar hasta lograrlo', async () => {
    mockAuthenticateSensitive.mockResolvedValueOnce('failed');
    renderGate();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Desbloquear con huella' })));

    expect(notifyError).toHaveBeenCalledWith('No se pudo verificar tu huella. Probá de nuevo.');
    expect(screen.queryByText('contenido de gastos')).toBeNull();

    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Desbloquear con huella' })));
    expect(screen.getByText('contenido de gastos')).toBeTruthy();
  });

  it('mientras el prompt está abierto el botón queda cargando y un segundo toque no pide otro', async () => {
    let finish!: (result: string) => void;
    mockAuthenticateSensitive.mockReturnValue(new Promise(resolve => (finish = resolve)));
    renderGate();
    fireEvent.press(screen.getByRole('button', { name: 'Desbloquear con huella' }));

    expect(screen.getByRole('button', { name: 'Desbloquear con huella', busy: true })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Desbloquear con huella' }));
    expect(mockAuthenticateSensitive).toHaveBeenCalledTimes(1);

    await act(async () => finish('success'));
    expect(screen.getByText('contenido de gastos')).toBeTruthy();
  });

  it('al volver del background (cambia la época) vuelve a taparse aunque estuviera desbloqueado', async () => {
    const { rerender } = renderGate();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Desbloquear con huella' })));
    expect(screen.getByText('contenido de gastos')).toBeTruthy();

    mockBiometrics.sensitiveEpoch = 1;
    rerender(
      <SensitiveGate module="expenses">
        <Text>contenido de gastos</Text>
      </SensitiveGate>
    );

    expect(screen.queryByText('contenido de gastos')).toBeNull();
    expect(screen.getByRole('button', { name: 'Desbloquear con huella' })).toBeTruthy();
  });

  it('el botón de volver del header solo aparece en rutas de stack y llama a onBack', () => {
    const onBack = jest.fn();
    const { unmount } = renderGate();
    expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
    unmount();

    renderGate({ onBack });
    fireEvent.press(screen.getByRole('button', { name: 'Volver', disabled: false }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
