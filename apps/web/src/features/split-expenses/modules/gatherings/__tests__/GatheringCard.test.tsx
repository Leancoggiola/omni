import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { GatheringCard } from '../components/GatheringCard';

import type { GatheringDetail, GatheringSummary } from '@omni/shared/split-expenses';

import { act, fireEvent, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  deleteGatheringExpense: vi.fn(),
  mutate: vi.fn(),
  state: {} as { gathering: unknown; error?: Error },
}));

vi.mock('@/shared/ui', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/ui')>()),
  confirm: mocks.confirm,
}));

vi.mock('../../_shared', () => ({
  useSplitExpensesMutations: () => ({
    addGatheringExpense: vi.fn(),
    deleteGatheringExpense: mocks.deleteGatheringExpense,
    toggleGatheringSettled: vi.fn(),
    deleteGathering: vi.fn(),
  }),
}));

vi.mock('../hooks', () => ({
  useGathering: () => ({ isLoading: false, mutate: mocks.mutate, ...mocks.state }),
}));

const summary: GatheringSummary = {
  id: 'g1',
  name: 'Asado',
  date: '2026-10-10',
  isSettled: false,
  participantCount: 2,
  totalAmount: 100,
};

const detail: GatheringDetail = {
  ...summary,
  settledAt: null,
  fairShare: 50,
  participants: [
    { id: 'p1', displayName: 'Ana', friendId: null, alias: null, totalPaid: 100 },
    { id: 'p2', displayName: 'Beto', friendId: null, alias: null, totalPaid: 0 },
  ],
  expenses: [{ id: 'e1', participantId: 'p1', participantName: 'Ana', amount: 100, description: null, createdAt: '' }],
  settlements: [],
};

const clickDeleteExpense = () => fireEvent.click(screen.getByRole('button', { name: 'Eliminar gasto de Ana' }));

describe('GatheringCard', () => {
  beforeEach(() => {
    mocks.confirm.mockReset().mockResolvedValue(true);
    mocks.deleteGatheringExpense.mockReset().mockResolvedValue(undefined);
    mocks.mutate.mockReset();
    mocks.state = { gathering: detail };
  });

  it('borrar un gasto pide confirmación y borra al confirmar', async () => {
    renderWithProviders(<GatheringCard summary={summary} />);

    clickDeleteExpense();

    await waitFor(() => expect(mocks.deleteGatheringExpense).toHaveBeenCalledWith('g1', 'e1'));
    expect(mocks.confirm).toHaveBeenCalledOnce();
  });

  it('si se cancela la confirmación no borra', async () => {
    mocks.confirm.mockResolvedValue(false);
    renderWithProviders(<GatheringCard summary={summary} />);

    clickDeleteExpense();

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledOnce());
    expect(mocks.deleteGatheringExpense).not.toHaveBeenCalled();
  });

  it('un doble clic mientras se borra no duplica el pedido', async () => {
    let finish!: () => void;
    mocks.deleteGatheringExpense.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    renderWithProviders(<GatheringCard summary={summary} />);

    clickDeleteExpense();
    clickDeleteExpense();
    await waitFor(() => expect(mocks.deleteGatheringExpense).toHaveBeenCalledOnce());
    clickDeleteExpense();
    await act(async () => finish());

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.deleteGatheringExpense).toHaveBeenCalledOnce();
  });

  it('muestra la fecha en formato de pantalla', () => {
    renderWithProviders(<GatheringCard summary={summary} />);

    expect(screen.getByText('10/10/2026', { exact: false })).toBeInTheDocument();
  });

  it('los controles de la juntada incluyen su nombre', () => {
    renderWithProviders(<GatheringCard summary={summary} />);

    expect(screen.getByRole('button', { name: 'Opciones de la juntada Asado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contraer Asado' })).toBeInTheDocument();
  });

  it('si falla la carga ofrece reintentar', () => {
    mocks.state = { gathering: null, error: new Error('x') };
    renderWithProviders(<GatheringCard summary={summary} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(mocks.mutate).toHaveBeenCalledOnce();
  });
});
