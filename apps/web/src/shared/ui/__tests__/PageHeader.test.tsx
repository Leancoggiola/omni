import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { PageHeader } from '../PageHeader';

import { screen } from '@testing-library/react';

function accentOf() {
  return screen.getByRole('heading', { level: 1 }).querySelector('span');
}

describe('PageHeader', () => {
  it('acentúa la última palabra del título por defecto', () => {
    renderWithProviders(<PageHeader icon={<span />} title="Películas y Series" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Películas y Series');
    expect(accentOf()).toHaveTextContent('Series');
  });

  it('acentúa la palabra indicada', () => {
    renderWithProviders(<PageHeader icon={<span />} title="Mi Perfil de usuario" accent="Perfil" />);
    expect(accentOf()).toHaveTextContent('Perfil');
  });

  it('con un acento explícito resalta la palabra completa y no una subcadena', () => {
    renderWithProviders(<PageHeader icon={<span />} title="Series de Seriesx" accent="Series" />);
    expect(accentOf()).toHaveTextContent(/^Series$/);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Series de Seriesx');
  });

  it('con un acento que no está en el título no resalta nada', () => {
    renderWithProviders(<PageHeader icon={<span />} title="Mi Perfil" accent="Perfil," />);
    expect(accentOf()).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mi Perfil');
  });

  it('no acentúa un título de una sola palabra', () => {
    renderWithProviders(<PageHeader icon={<span />} title="Administración" />);
    expect(accentOf()).toBeNull();
  });

  it('muestra el subtítulo y las acciones', () => {
    renderWithProviders(
      <PageHeader icon={<span />} title="Mi Perfil" subtitle="Tus datos" actions={<button>Ir</button>} />
    );
    expect(screen.getByText('Tus datos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir' })).toBeInTheDocument();
  });
});
