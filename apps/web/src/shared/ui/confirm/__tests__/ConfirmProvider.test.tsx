import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { confirm } from '../confirm';
import { ConfirmProvider } from '../ConfirmProvider';

import { act, fireEvent, screen } from '@testing-library/react';

const renderProvider = () => renderWithProviders(<ConfirmProvider>contenido</ConfirmProvider>);

describe('ConfirmProvider', () => {
  it('resuelve true al confirmar y false al cancelar', async () => {
    renderProvider();

    let result!: Promise<boolean>;
    act(() => {
      result = confirm({ title: 'Eliminar', description: '¿Seguro?', confirmLabel: 'Sí', cancelLabel: 'No' });
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Sí' }));
    await expect(result).resolves.toBe(true);

    act(() => {
      result = confirm({ title: 'Eliminar', description: '¿Seguro?', confirmLabel: 'Sí', cancelLabel: 'No' });
    });
    fireEvent.click(await screen.findByRole('button', { name: 'No' }));
    await expect(result).resolves.toBe(false);
  });

  it('un doble clic no descarta el pedido que sigue en la cola', async () => {
    renderProvider();

    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = confirm({ title: 'Uno', description: 'Primero', confirmLabel: 'Aceptar' });
      second = confirm({ title: 'Dos', description: 'Segundo', confirmLabel: 'Aceptar' });
    });
    const accept = await screen.findByRole('button', { name: 'Aceptar' });
    act(() => {
      fireEvent.click(accept);
      fireEvent.click(accept);
    });
    await expect(first).resolves.toBe(true);

    expect(await screen.findByText('Segundo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
    await expect(second).resolves.toBe(true);
  });

  it('conserva el contenido mientras se cierra el modal', async () => {
    renderProvider();

    act(() => {
      void confirm({ title: 'Eliminar', description: '¿Seguro?', cancelLabel: 'No' });
    });
    fireEvent.click(await screen.findByRole('button', { name: 'No' }));

    expect(screen.queryByText('¿Seguro?')).toBeInTheDocument();
  });
});
