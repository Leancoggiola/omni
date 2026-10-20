import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { ErrorState } from '../ErrorState';

import { act, fireEvent, screen, waitFor } from '@testing-library/react';

describe('ErrorState', () => {
  it('sin onRetry no muestra el botón', () => {
    renderWithProviders(<ErrorState message="Falló" />);

    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('mientras el reintento está en curso deja el botón en carga y no lo dispara dos veces', async () => {
    let finish!: () => void;
    const onRetry = vi.fn(() => new Promise<void>(resolve => (finish = resolve)));
    renderWithProviders(<ErrorState message="Falló" onRetry={onRetry} />);

    const button = screen.getByRole('button', { name: 'Reintentar' });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(button).toHaveAttribute('data-loading', 'true'));
    expect(onRetry).toHaveBeenCalledOnce();

    await act(async () => finish());
    await waitFor(() => expect(button).not.toHaveAttribute('data-loading'));
  });
});
