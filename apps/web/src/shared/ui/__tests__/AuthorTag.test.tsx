import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { AuthorTag } from '../AuthorTag';

import { screen } from '@testing-library/react';

describe('AuthorTag', () => {
  it('muestra el nombre del otro integrante', () => {
    renderWithProviders(<AuthorTag author={{ kind: 'member', name: 'Lucía', avatarUrl: null }} />);

    expect(screen.getByLabelText('Agregado por Lucía')).toBeInTheDocument();
    expect(screen.getByText('Lucía', { selector: 'p' })).toBeInTheDocument();
  });

  it('dice "Vos" para la propia sesión', () => {
    renderWithProviders(<AuthorTag author={{ kind: 'self', name: 'Leandro', avatarUrl: null }} />);

    expect(screen.getByText('Vos')).toBeInTheDocument();
  });

  it('la cuenta eliminada es un avatar neutro con "?"', () => {
    renderWithProviders(<AuthorTag author={{ kind: 'deleted', name: 'Cuenta eliminada', avatarUrl: null }} />);

    expect(screen.getByText('?')).toBeInTheDocument();
    expect(screen.getByText('Cuenta eliminada')).toBeInTheDocument();
  });

  it('sin nombre queda solo el avatar con su aria-label', () => {
    renderWithProviders(<AuthorTag author={{ kind: 'member', name: 'Lucía', avatarUrl: null }} showName={false} />);

    expect(screen.getByLabelText('Agregado por Lucía')).toBeInTheDocument();
    expect(screen.queryByText('Lucía', { selector: 'p' })).not.toBeInTheDocument();
  });
});
