import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { ProductFormModal } from '../components/ProductFormModal';
import { product } from './fixtures';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/core/household', () => ({ useItemAuthor: () => undefined }));

describe('ProductFormModal', () => {
  it('en la edición Guardar arranca deshabilitado y se habilita con un cambio (stepper)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<ProductFormModal opened onClose={vi.fn()} product={product()} onSubmit={onSubmit} />);

    const save = screen.getByRole('button', { name: 'Guardar cambios' });
    expect(save).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Sumar uno' }));
    expect(save).toBeEnabled();

    await userEvent.click(save);
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Leche entera', quantity: 2, unit: 'PACKAGES' })
      )
    );
  });

  it('en el alta valida lo obligatorio antes de enviar', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<ProductFormModal opened onClose={vi.fn()} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByRole('textbox', { name: /Nombre/ }), 'Té');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));

    expect(await screen.findByText('Elegí una categoría')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('muestra el mensaje de la API si falla guardar', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('x'));
    renderWithProviders(<ProductFormModal opened onClose={vi.fn()} product={product()} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: 'Sumar uno' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('No se pudo guardar el producto')).toBeInTheDocument();
  });
});
