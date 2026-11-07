import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { notifyError } from '@/shared/ui';

import { ProfilePhotoCard } from './ProfilePhotoCard';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('@/shared/ui', () => ({
  ...jest.requireActual('@/shared/ui'),
  notifyError: jest.fn(),
}));

const launch = jest.mocked(ImagePicker.launchImageLibraryAsync);
const PROFILE = { name: 'Admin Omni', avatarUrl: null };

const pick = async () => act(async () => fireEvent.press(screen.getByRole('button', { name: 'Cambiar foto' })));
const asset = (overrides: Record<string, unknown> = {}) =>
  ({
    canceled: false,
    assets: [{ uri: 'file:///foto.png', mimeType: 'image/png', fileSize: 1000, ...overrides }],
  }) as never;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProfilePhotoCard', () => {
  it('muestra el título, la ayuda y las iniciales sin foto', () => {
    render(<ProfilePhotoCard profile={PROFILE} />);

    expect(screen.getByText('Foto de perfil')).toBeTruthy();
    expect(screen.getByText('Actualizá tu foto de perfil')).toBeTruthy();
    expect(screen.getByText('JPG, PNG o GIF (máx. 5MB)')).toBeTruthy();
    expect(screen.getByText('AO')).toBeTruthy();
  });

  it('con una imagen válida muestra la vista previa en lugar de las iniciales', async () => {
    launch.mockResolvedValue(asset());
    render(<ProfilePhotoCard profile={PROFILE} />);
    await pick();

    expect(screen.queryByText('AO')).toBeNull();
    expect(screen.getByLabelText('Foto de Admin Omni')).toBeTruthy();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('si el usuario cancela no cambia nada', async () => {
    launch.mockResolvedValue({ canceled: true, assets: null });
    render(<ProfilePhotoCard profile={PROFILE} />);
    await pick();

    expect(screen.getByText('AO')).toBeTruthy();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('rechaza tipos no admitidos y archivos de más de 5MB con notifyError', async () => {
    render(<ProfilePhotoCard profile={PROFILE} />);

    launch.mockResolvedValueOnce(asset({ mimeType: 'image/webp' }));
    await pick();
    expect(notifyError).toHaveBeenLastCalledWith('Elegí una imagen JPG, PNG o GIF');

    launch.mockResolvedValueOnce(asset({ fileSize: 6 * 1024 * 1024 }));
    await pick();
    expect(notifyError).toHaveBeenLastCalledWith('La imagen no puede pesar más de 5MB');
    expect(screen.getByText('AO')).toBeTruthy();
  });

  it('si el selector falla avisa con notifyError', async () => {
    launch.mockRejectedValue(new Error('boom'));
    render(<ProfilePhotoCard profile={PROFILE} />);
    await pick();

    expect(notifyError).toHaveBeenCalledWith('No se pudo abrir la galería');
  });
});
