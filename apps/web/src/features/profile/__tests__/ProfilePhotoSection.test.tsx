import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { ProfilePhotoSection } from '../components/ProfilePhotoSection';

import { ApiError } from '@omni/shared/api';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const notify = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));

vi.mock('@/shared/ui', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/ui')>()),
  ...notify,
}));

const onUpload = vi.fn();
const onRemove = vi.fn();

function renderSection(avatarUrl: string | null = null, isBusy = false) {
  const { container } = renderWithProviders(
    <ProfilePhotoSection name="Ana" avatarUrl={avatarUrl} isBusy={isBusy} onUpload={onUpload} onRemove={onRemove} />
  );
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

describe('ProfilePhotoSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onUpload.mockResolvedValue(undefined);
    onRemove.mockResolvedValue(undefined);
  });

  it('sube la foto válida y avisa el éxito', async () => {
    const input = renderSection();
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    await userEvent.upload(input, file);

    await waitFor(() => expect(notify.notifySuccess).toHaveBeenCalledWith('Foto de perfil actualizada'));
    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it('rechaza un formato no admitido sin subir', async () => {
    const input = renderSection();

    await userEvent.upload(input, new File(['x'], 'a.gif', { type: 'image/gif' }), { applyAccept: false });

    expect(notify.notifyError).toHaveBeenCalledWith(expect.stringContaining('Formato'));
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('rechaza una foto que pasa el tope de peso', async () => {
    const input = renderSection();
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'a.png', { type: 'image/png' });

    await userEvent.upload(input, big);

    expect(notify.notifyError).toHaveBeenCalledWith(expect.stringContaining('2 MB'));
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('muestra el error de la API si falla la subida', async () => {
    onUpload.mockRejectedValue(new ApiError('Formato de imagen no admitido', 415, null));
    const input = renderSection();

    await userEvent.upload(input, new File(['x'], 'a.png', { type: 'image/png' }));

    await waitFor(() => expect(notify.notifyError).toHaveBeenCalledWith('Formato de imagen no admitido'));
  });

  it('quita la foto solo si hay una', async () => {
    renderSection('https://cdn.test/a.png');

    await userEvent.click(screen.getByRole('button', { name: 'Quitar foto' }));

    await waitFor(() => expect(notify.notifySuccess).toHaveBeenCalledWith('Foto de perfil eliminada'));
    expect(onRemove).toHaveBeenCalled();
  });

  it('sin foto no ofrece quitarla', () => {
    renderSection(null);
    expect(screen.queryByRole('button', { name: 'Quitar foto' })).toBeNull();
  });
});
