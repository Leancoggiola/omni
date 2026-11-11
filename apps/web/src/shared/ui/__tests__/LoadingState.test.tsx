import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { LoadingState } from '../LoadingState';

import { screen } from '@testing-library/react';

describe('LoadingState', () => {
  it('muestra el spinner por defecto, llamado "Cargando"', () => {
    renderWithProviders(<LoadingState />);

    expect(screen.getByRole('status', { name: 'Cargando' })).toBeInTheDocument();
  });

  it('con variant="skeleton" es un único status "Cargando" con una fila por cada `rows`', () => {
    const { container } = renderWithProviders(<LoadingState variant="skeleton" rows={4} />);

    expect(screen.getAllByRole('status', { name: 'Cargando' })).toHaveLength(1);
    expect(container.querySelectorAll('[data-visible]')).toHaveLength(4 * 4);
  });
});
