import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';
import { ApiError } from '@/shared/api';

import { PasswordForm } from '../components/PasswordForm';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const field = (name: string) => screen.getByLabelText(name);

interface FillOptions {
  current?: string;
  next?: string;
  confirm?: string;
}

async function fillForm({ current = 'actual-123', next = 'nueva-clave-1', confirm = next }: FillOptions = {}) {
  await userEvent.type(field('Contraseña actual'), current);
  await userEvent.type(field('Nueva contraseña'), next);
  await userEvent.type(field('Confirmar contraseña'), confirm);
}

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

describe('PasswordForm', () => {
  const onSubmit = vi.fn();

  beforeEach(() => {
    onSubmit.mockReset().mockResolvedValue(undefined);
  });

  it('pide la contraseña actual junto con la nueva y la confirmación', () => {
    renderWithProviders(<PasswordForm onSubmit={onSubmit} />);

    expect(field('Contraseña actual')).toBeTruthy();
    expect(field('Nueva contraseña')).toBeTruthy();
    expect(field('Confirmar contraseña')).toBeTruthy();
  });

  it('envía la contraseña actual y la nueva, y limpia el formulario', async () => {
    renderWithProviders(<PasswordForm onSubmit={onSubmit} />);

    await fillForm();
    await submit();

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ currentPassword: 'actual-123', newPassword: 'nueva-clave-1' })
    );
    await waitFor(() => expect(field('Contraseña actual')).toHaveProperty('value', ''));
  });

  it('exige la contraseña actual', async () => {
    renderWithProviders(<PasswordForm onSubmit={onSubmit} />);

    await userEvent.type(field('Nueva contraseña'), 'nueva-clave-1');
    await userEvent.type(field('Confirmar contraseña'), 'nueva-clave-1');
    await submit();

    expect(await screen.findByText('La contraseña actual es requerida')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('muestra los mensajes del schema para una contraseña nueva corta y para una demasiado larga', async () => {
    renderWithProviders(<PasswordForm onSubmit={onSubmit} />);

    await fillForm({ next: 'corta' });
    await submit();
    expect(await screen.findByText('La contraseña debe tener al menos 8 caracteres')).toBeTruthy();

    await userEvent.clear(field('Nueva contraseña'));
    await userEvent.type(field('Nueva contraseña'), 'x'.repeat(73));
    await submit();
    expect(await screen.findByText('La contraseña no puede tener más de 72 caracteres')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('marca que la confirmación no coincide con la nueva contraseña', async () => {
    renderWithProviders(<PasswordForm onSubmit={onSubmit} />);

    await fillForm({ confirm: 'otra-clave-123' });
    await submit();

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('muestra el error de la API cuando la contraseña actual es incorrecta', async () => {
    onSubmit.mockRejectedValue(new ApiError('La contraseña actual es incorrecta', 400));
    renderWithProviders(<PasswordForm onSubmit={onSubmit} />);

    await fillForm();
    await submit();

    expect(await screen.findByText('La contraseña actual es incorrecta')).toBeTruthy();
    expect(field('Nueva contraseña')).toHaveProperty('value', 'nueva-clave-1');
  });
});
