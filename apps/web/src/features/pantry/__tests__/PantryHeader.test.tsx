import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { PantryHeader } from '../components/PantryHeader';

import type { ComponentProps } from 'react';

import { screen } from '@testing-library/react';

function renderHeader(overrides: Partial<ComponentProps<typeof PantryHeader>> = {}) {
  renderWithProviders(
    <PantryHeader
      tab="shopping"
      onTabChange={vi.fn()}
      pendingCount={undefined}
      linked
      onAddProduct={vi.fn()}
      {...overrides}
    />
  );
}

describe('PantryHeader', () => {
  it('avisa que se actualiza solo en la lista de un hogar compartido', () => {
    renderHeader();

    expect(screen.getByRole('status')).toHaveTextContent('Se actualiza solo cada 20 s');
  });

  it('sin vincular no muestra el aviso', () => {
    renderHeader({ linked: false });

    expect(screen.queryByText(/Se actualiza solo/)).not.toBeInTheDocument();
  });

  it('en el inventario no muestra el aviso', () => {
    renderHeader({ tab: 'inventory' });

    expect(screen.queryByText(/Se actualiza solo/)).not.toBeInTheDocument();
  });
});
