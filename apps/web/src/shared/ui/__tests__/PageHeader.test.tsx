import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { PageHeader } from '../PageHeader';

import { screen } from '@testing-library/react';

describe('PageHeader', () => {
  it('acentúa la última palabra del título por defecto', () => {
    renderWithProviders(<PageHeader icon={<span />} title="Películas y Series" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Películas y Series');
    expect(screen.getByTestId('page-header-accent')).toHaveTextContent('Series');
  });

  it('acentúa la palabra indicada', () => {
    renderWithProviders(<PageHeader icon={<span />} title="Mi Perfil de usuario" accent="Perfil" />);
    expect(screen.getByTestId('page-header-accent')).toHaveTextContent('Perfil');
  });

  it('no acentúa un título de una sola palabra', () => {
    renderWithProviders(<PageHeader icon={<span />} title="Administración" />);
    expect(screen.queryByTestId('page-header-accent')).not.toBeInTheDocument();
  });

  it('muestra el subtítulo y las acciones', () => {
    renderWithProviders(
      <PageHeader icon={<span />} title="Mi Perfil" subtitle="Tus datos" actions={<button>Ir</button>} />
    );
    expect(screen.getByText('Tus datos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir' })).toBeInTheDocument();
  });
});
