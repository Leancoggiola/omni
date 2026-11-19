import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { EmptyState } from '../EmptyState';

import { screen } from '@testing-library/react';

describe('EmptyState', () => {
  it('muestra el título, la descripción opcional y la acción', () => {
    renderWithProviders(
      <EmptyState
        icon={<span />}
        title="Todavía no tenés planes"
        description="Armá un plan."
        action={<button>Crear</button>}
      />
    );

    expect(screen.getByText('Todavía no tenés planes')).toBeInTheDocument();
    expect(screen.getByText('Armá un plan.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument();
  });

  it('sin descripción ni acción solo muestra el título', () => {
    renderWithProviders(<EmptyState icon={<span />} title="Sin datos" />);

    expect(screen.getByText('Sin datos')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
