import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { DeleteAccountButton } from '../DeleteAccountButton';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const ui = vi.hoisted(() => ({
  confirm: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock('@/shared/ui', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/ui')>()),
  confirm: ui.confirm,
  notifyError: ui.notifyError,
}));

async function clickDelete() {
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar cuenta' }));
}

describe('DeleteAccountButton', () => {
  beforeEach(() => {
    ui.confirm.mockReset().mockResolvedValue(true);
    ui.notifyError.mockReset();
  });

  it('no elimina nada si el usuario cancela la confirmación', async () => {
    ui.confirm.mockResolvedValue(false);
    const onDelete = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<DeleteAccountButton onDelete={onDelete} />);

    await clickDelete();

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('elimina la cuenta tras confirmar, sin mostrar errores', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<DeleteAccountButton onDelete={onDelete} />);

    await clickDelete();

    await waitFor(() => expect(onDelete).toHaveBeenCalledOnce());
    expect(ui.notifyError).not.toHaveBeenCalled();
  });

  it('muestra el error del servidor y vuelve a habilitar el botón si falla', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('Servicio no disponible'));
    renderWithProviders(<DeleteAccountButton onDelete={onDelete} />);

    await clickDelete();

    await waitFor(() => expect(ui.notifyError).toHaveBeenCalledWith('Servicio no disponible'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Eliminar cuenta' })).toBeEnabled());
  });

  it('usa un mensaje genérico si el rechazo no es un Error', async () => {
    const onDelete = vi.fn().mockRejectedValue('boom');
    renderWithProviders(<DeleteAccountButton onDelete={onDelete} />);

    await clickDelete();

    await waitFor(() => expect(ui.notifyError).toHaveBeenCalledWith('No se pudo eliminar la cuenta'));
  });
});
