import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { SplitExpensesHeader } from '../components/SplitExpensesHeader';

import { screen } from '@testing-library/react';

const state = vi.hoisted(() => ({ value: {} as { balance: unknown; error?: Error } }));

vi.mock('../hooks/useSplitBalance', () => ({
  useSplitBalance: () => ({ isLoading: false, mutate: vi.fn(), ...state.value }),
}));

describe('SplitExpensesHeader', () => {
  beforeEach(() => {
    state.value = { balance: null };
  });

  it('titula "Gastos compartidos" y resume el saldo propio', () => {
    state.value = { balance: { owedToYou: 24000, youOwe: 12500, net: 11500, gatheringCount: 2 } };
    renderWithProviders(<SplitExpensesHeader onOpenFriends={vi.fn()} onNewGathering={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Gastos compartidos' })).toBeInTheDocument();
    expect(screen.getByText('Te deben $24.000,00 · debés $12.500,00')).toBeInTheDocument();
  });

  it('mientras no hay saldo muestra la descripción de la sección', () => {
    renderWithProviders(<SplitExpensesHeader onOpenFriends={vi.fn()} onNewGathering={vi.fn()} />);

    expect(screen.getByText('Dividí los gastos de tus juntadas fácilmente')).toBeInTheDocument();
  });

  it('si falla el saldo lo dice en lugar de mostrar un saldo vacío', () => {
    state.value = { balance: null, error: new Error('x') };
    renderWithProviders(<SplitExpensesHeader onOpenFriends={vi.fn()} onNewGathering={vi.fn()} />);

    expect(screen.getByText('No se pudo cargar tu saldo')).toBeInTheDocument();
  });
});
