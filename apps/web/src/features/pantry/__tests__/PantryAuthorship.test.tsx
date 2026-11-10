import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { PantryItemAuthor } from '../components/PantryItemAuthor';
import { ProductAuthorRows } from '../components/ProductAuthorRows';

import type { ItemAuthor } from '@omni/shared/household';

import { screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  author: undefined as ItemAuthor | undefined,
  editor: undefined as ItemAuthor | undefined,
}));

vi.mock('@/core/household', () => ({
  useItemAuthor: () => mocks.author,
  useItemEditor: (createdById: string | null, updatedById: string | null) =>
    updatedById && updatedById !== createdById ? mocks.editor : undefined,
}));

const ANA: ItemAuthor = { kind: 'member', name: 'Ana', avatarUrl: null };
const SELF: ItemAuthor = { kind: 'self', name: 'Leo', avatarUrl: null };

beforeEach(() => {
  mocks.author = ANA;
  mocks.editor = undefined;
});

describe('PantryItemAuthor', () => {
  it('muestra solo quién lo agregó si no editó otra persona', () => {
    renderWithProviders(<PantryItemAuthor createdById="u2" updatedById="u2" />);

    expect(screen.getByRole('group', { name: 'Agregado por Ana' })).toBeInTheDocument();
    expect(screen.queryByText(/Editado por/)).not.toBeInTheDocument();
  });

  it('suma "Editado por" a la vista si editó otra persona', () => {
    mocks.editor = SELF;
    renderWithProviders(<PantryItemAuthor createdById="u2" updatedById="u1" />);

    expect(screen.getByRole('group', { name: 'Agregado por Ana' })).toBeInTheDocument();
    expect(screen.getByText('Editado por Vos')).toBeInTheDocument();
  });
});

describe('ProductAuthorRows', () => {
  it('muestra las dos filas si editó otra persona', () => {
    mocks.editor = SELF;
    renderWithProviders(<ProductAuthorRows createdById="u2" updatedById="u1" />);

    expect(screen.getByText('Agregado por')).toBeInTheDocument();
    expect(screen.getByText('Editado por')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Editado por Vos' })).toBeInTheDocument();
  });

  it('sin autor resuelto ni editor no muestra ninguna fila', () => {
    mocks.author = undefined;
    renderWithProviders(<ProductAuthorRows createdById="u9" updatedById={null} />);

    expect(screen.queryByText('Agregado por')).not.toBeInTheDocument();
    expect(screen.queryByText('Editado por')).not.toBeInTheDocument();
  });
});
