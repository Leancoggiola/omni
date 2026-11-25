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

  it('dibuja el ícono en un círculo de 56 px', () => {
    const { container } = renderWithProviders(<EmptyState icon={<span />} title="Sin datos" />);

    expect(container.querySelector('[style*="--empty-state-indicator-size: 1.75rem"]')).toBeInTheDocument();
  });

  it('compact muestra título, descripción y acción en una fila, sin el estado vacío grande', () => {
    const { container } = renderWithProviders(
      <EmptyState
        compact
        icon={<span />}
        title="Sin ubicación"
        description="Activala."
        action={<button>Permitir</button>}
      />
    );

    expect(screen.getByText('Sin ubicación')).toBeInTheDocument();
    expect(screen.getByText('Activala.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Permitir' })).toBeInTheDocument();
    expect(container.querySelector('.mantine-EmptyState-root')).not.toBeInTheDocument();
  });
});
