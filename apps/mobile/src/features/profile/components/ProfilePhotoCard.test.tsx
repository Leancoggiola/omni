import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { notifyError, notifySuccess } from '@/shared/ui';

import { ProfilePhotoCard } from './ProfilePhotoCard';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('@/shared/ui', () => ({
  ...jest.requireActual('@/shared/ui'),
  notifyError: jest.fn(),
  notifySuccess: jest.fn(),
}));

const launch = jest.mocked(ImagePicker.launchImageLibraryAsync);
const onUpload = jest.fn();
const onRemove = jest.fn();
const PROFILE: { name: string; avatarUrl: string | null } = { name: 'Admin Omni', avatarUrl: null };
const WITH_PHOTO = { name: 'Admin Omni', avatarUrl: 'https://cdn.test/a.webp' };

const renderCard = (profile = PROFILE) =>
  render(<ProfilePhotoCard profile={profile} onUpload={onUpload} onRemove={onRemove} />);
const press = async (name: string) => act(async () => fireEvent.press(screen.getByRole('button', { name })));
const asset = (overrides: Record<string, unknown> = {}) =>
  ({
    canceled: false,
    assets: [{ uri: 'file:///foto.png', mimeType: 'image/png', fileSize: 1000, ...overrides }],
  }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  onUpload.mockResolvedValue(undefined);
  onRemove.mockResolvedValue(undefined);
});

describe('ProfilePhotoCard', () => {
  it('muestra el título, la ayuda y las iniciales sin foto, sin botón de quitar', () => {
    renderCard();

    expect(screen.getByText('Foto de perfil')).toBeTruthy();
    expect(screen.getByText('JPG, PNG o WebP (máx. 2MB)')).toBeTruthy();
    expect(screen.getByText('AO')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Quitar foto' })).toBeNull();
  });

  it('con una imagen válida la sube y avisa', async () => {
    launch.mockResolvedValue(asset());
    renderCard();
    await press('Cambiar foto');

    expect(onUpload).toHaveBeenCalledWith(expect.objectContaining({ uri: 'file:///foto.png', mimeType: 'image/png' }));
    expect(notifySuccess).toHaveBeenCalledWith('Foto de perfil actualizada');
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('si la subida falla avisa con notifyError', async () => {
    launch.mockResolvedValue(asset());
    onUpload.mockRejectedValue(new Error('boom'));
    renderCard();
    await press('Cambiar foto');

    expect(notifyError).toHaveBeenCalledWith('No se pudo subir la foto');
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('si el usuario cancela no sube nada', async () => {
    launch.mockResolvedValue({ canceled: true, assets: null });
    renderCard();
    await press('Cambiar foto');

    expect(onUpload).not.toHaveBeenCalled();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('rechaza tipos no admitidos y archivos de más de 2MB sin subir', async () => {
    renderCard();

    launch.mockResolvedValueOnce(asset({ mimeType: 'image/gif' }));
    await press('Cambiar foto');
    expect(notifyError).toHaveBeenLastCalledWith('Elegí una imagen JPG, PNG o WebP');

    launch.mockResolvedValueOnce(asset({ fileSize: 3 * 1024 * 1024 }));
    await press('Cambiar foto');
    expect(notifyError).toHaveBeenLastCalledWith('La imagen no puede pesar más de 2MB');
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('si el selector falla avisa con notifyError', async () => {
    launch.mockRejectedValue(new Error('boom'));
    renderCard();
    await press('Cambiar foto');

    expect(notifyError).toHaveBeenCalledWith('No se pudo abrir la galería');
  });

  it('con foto permite quitarla y avisa', async () => {
    renderCard(WITH_PHOTO);
    await press('Quitar foto');

    expect(onRemove).toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalledWith('Foto de perfil eliminada');
  });

  it('si quitar la foto falla avisa con notifyError', async () => {
    onRemove.mockRejectedValue(new Error('boom'));
    renderCard(WITH_PHOTO);
    await press('Quitar foto');

    expect(notifyError).toHaveBeenCalledWith('No se pudo quitar la foto');
  });
});
