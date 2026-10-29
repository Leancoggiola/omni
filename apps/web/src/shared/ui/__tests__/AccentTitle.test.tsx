import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { AccentTitle } from '../AccentTitle';

import { screen } from '@testing-library/react';

const accentOf = () => screen.getByRole('heading').querySelector('span');

describe('AccentTitle', () => {
  it('resalta una palabra que va seguida de puntuación', () => {
    renderWithProviders(<AccentTitle order={2} title="¡Te damos la bienvenida a Omni!" accent="Omni" />);
    expect(accentOf()).toHaveTextContent(/^Omni$/);
    expect(screen.getByRole('heading')).toHaveTextContent('¡Te damos la bienvenida a Omni!');
  });

  it('por defecto resalta la última palabra sin su puntuación', () => {
    renderWithProviders(<AccentTitle order={2} title="Bienvenida a Omni!" />);
    expect(accentOf()).toHaveTextContent(/^Omni$/);
  });

  it('no resalta una subcadena de otra palabra', () => {
    renderWithProviders(<AccentTitle order={2} title="Omnipresente en Omni" accent="Omni" />);
    expect(accentOf()).toHaveTextContent(/^Omni$/);
    expect(screen.getByRole('heading').textContent).toBe('Omnipresente en Omni');
  });

  it('acentúa la última palabra compuesta por defecto', () => {
    renderWithProviders(<AccentTitle order={2} title="Mis Pelis-Top" />);
    expect(accentOf()).toHaveTextContent(/^Pelis-Top$/);
  });

  it('acepta un acento con caracteres especiales de regex', () => {
    renderWithProviders(<AccentTitle order={2} title="Mi lista C++ favorita" accent="C++" />);
    expect(accentOf()).toHaveTextContent(/^C\+\+$/);
  });

  it('no resalta con un acento inexistente, vacío o un título de una palabra', () => {
    const { unmount } = renderWithProviders(<AccentTitle order={2} title="Mi Perfil" accent="Otro" />);
    expect(accentOf()).toBeNull();
    unmount();
    const empty = renderWithProviders(<AccentTitle order={2} title="Mi Perfil" accent="" />);
    expect(accentOf()).toBeNull();
    empty.unmount();
    renderWithProviders(<AccentTitle order={2} title="Perfil" />);
    expect(accentOf()).toBeNull();
  });
});
