import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { NotificationCard } from '../NotificationCard';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('NotificationCard', () => {
  it('muestra título y mensaje', () => {
    renderWithProviders(<NotificationCard variant="success" title="Listo" message="Guardado" />);
    expect(screen.getByText('Listo')).toBeInTheDocument();
    expect(screen.getByText('Guardado')).toBeInTheDocument();
  });

  it('cierra con el botón', async () => {
    const onClose = vi.fn();
    renderWithProviders(<NotificationCard variant="info" title="Info" message="Hola" onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sin onClose no muestra el botón de cerrar', () => {
    renderWithProviders(<NotificationCard variant="error" message="Falló" />);
    expect(screen.queryByRole('button', { name: 'Cerrar notificación' })).not.toBeInTheDocument();
  });
});
