import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

import { ApiError } from '@omni/shared/api';

import { InviteCodeSheet } from './InviteCodeSheet';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(true) }));

const INVITE = { id: 'i1', code: 'K7M2QX4P', expiresAt: new Date(Date.now() + 48 * 3_600_000).toISOString() };

const onOpenChange = jest.fn();
const onRevoke = jest.fn();
const onClosed = jest.fn();

function renderSheet() {
  render(<InviteCodeSheet invite={INVITE} open onOpenChange={onOpenChange} onRevoke={onRevoke} onClosed={onClosed} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  onRevoke.mockResolvedValue(undefined);
});

describe('InviteCodeSheet', () => {
  it('muestra el código agrupado y avisa que se ve una sola vez', () => {
    renderSheet();

    expect(screen.getByText('K7M2 QX4P')).toBeTruthy();
    expect(screen.getByText(/se muestra una sola vez/)).toBeTruthy();
    expect(screen.getByText(/Vence en 48 h/)).toBeTruthy();
  });

  it('copiar guarda el código en el portapapeles y lo confirma en el botón', async () => {
    renderSheet();

    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Copiar código' })));

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('K7M2QX4P');
    expect(screen.getByRole('button', { name: 'Código copiado' })).toBeTruthy();
  });

  it('compartir abre el menú del sistema con el mensaje', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    renderSheet();

    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Compartir código' })));

    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('K7M2-QX4P') });
  });

  it('revocar llama a la API y cierra la hoja', async () => {
    renderSheet();

    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Revocar invitación' })));

    expect(onRevoke).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('si revocar falla muestra el error adentro y no cierra', async () => {
    onRevoke.mockRejectedValue(new ApiError('Demasiadas invitaciones generadas', 429));
    renderSheet();

    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Revocar invitación' })));

    expect(screen.getByText('Demasiadas invitaciones generadas')).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
