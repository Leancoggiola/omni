import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { SplitExpensesPage } from '../split-expenses.page';

import type { GatheringSummary } from '@omni/shared/split-expenses';

import { fireEvent, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  state: {} as { items: GatheringSummary[]; isLoading: boolean; error?: Error },
}));

vi.mock('../modules/gatherings/hooks/useGatherings', () => ({
  useGatherings: () => ({ mutate: mocks.mutate, ...mocks.state }),
}));

vi.mock('../modules/gatherings/hooks/useSplitBalance', () => ({
  useSplitBalance: () => ({ balance: null, isLoading: false, error: undefined, mutate: vi.fn() }),
}));

vi.mock('../modules/gatherings/components/GatheringWorkspace', () => ({
  GatheringWorkspace: ({ gatheringId }: { gatheringId: string }) => <div>detalle {gatheringId}</div>,
}));

const gathering = (id: string, name: string): GatheringSummary => ({
  id,
  name,
  date: '2026-10-18',
  isSettled: false,
  participantCount: 3,
  totalAmount: 90,
  myBalance: 30,
});

describe('SplitExpensesPage', () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.state = { items: [], isLoading: false };
  });

  it('si falla la carga muestra el error con reintento, nunca el estado vacío', () => {
    mocks.state = { items: [], isLoading: false, error: new Error('x') };
    renderWithProviders(<SplitExpensesPage />);

    expect(screen.getByText('No se pudieron cargar las juntadas')).toBeInTheDocument();
    expect(screen.queryByText('Todavía no tenés juntadas')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(mocks.mutate).toHaveBeenCalledOnce();
  });

  it('sin juntadas muestra el estado vacío', () => {
    renderWithProviders(<SplitExpensesPage />);

    expect(screen.getByText('Todavía no tenés juntadas')).toBeInTheDocument();
  });

  it('abre la primera juntada y cambia de detalle al elegir otra', () => {
    mocks.state = { items: [gathering('a', 'Asado'), gathering('b', 'Finde')], isLoading: false };
    renderWithProviders(<SplitExpensesPage />);

    expect(screen.getByText('detalle a')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Finde/ }));

    expect(screen.getByText('detalle b')).toBeInTheDocument();
  });
});
