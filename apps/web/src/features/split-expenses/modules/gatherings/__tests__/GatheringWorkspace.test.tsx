import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { GatheringWorkspace } from '../components/GatheringWorkspace';

import type { GatheringDetail } from '@omni/shared/split-expenses';

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  addGatheringExpense: vi.fn(),
  confirm: vi.fn(),
  deleteGatheringExpense: vi.fn(),
  toggleGatheringSettled: vi.fn(),
  mutate: vi.fn(),
  state: {} as { gathering: unknown; error?: Error },
}));

vi.mock('@/shared/ui', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/ui')>()),
  confirm: mocks.confirm,
}));

vi.mock('../../../hooks/useSplitExpensesMutations', () => ({
  useSplitExpensesMutations: () => ({
    addGatheringExpense: mocks.addGatheringExpense,
    deleteGatheringExpense: mocks.deleteGatheringExpense,
    toggleGatheringSettled: mocks.toggleGatheringSettled,
    deleteGathering: vi.fn(),
  }),
}));

vi.mock('../hooks/useGathering', () => ({
  useGathering: () => ({ isLoading: false, mutate: mocks.mutate, ...mocks.state }),
}));

const detail: GatheringDetail = {
  id: 'g1',
  name: 'Asado',
  date: '2026-10-10',
  isSettled: false,
  settledAt: null,
  participantCount: 3,
  totalAmount: 90,
  myBalance: 30,
  participants: [
    {
      id: 'p0',
      displayName: 'Mateo',
      friendId: null,
      alias: null,
      totalPaid: 90,
      owed: 30,
      balance: 60,
      isSelf: true,
    },
    { id: 'p1', displayName: 'Ana', friendId: null, alias: null, totalPaid: 0, owed: 30, balance: -30, isSelf: false },
    { id: 'p2', displayName: 'Beto', friendId: null, alias: null, totalPaid: 0, owed: 30, balance: -30, isSelf: false },
  ],
  expenses: [
    {
      id: 'e1',
      participantId: 'p0',
      participantName: 'Mateo',
      amount: 90,
      description: 'Carne',
      sharedWith: [],
      createdAt: '2026-10-10T12:40:00',
    },
  ],
  settlements: [
    { fromParticipantId: 'p1', fromName: 'Ana', toParticipantId: 'p0', toName: 'Mateo', amount: 30 },
    { fromParticipantId: 'p2', fromName: 'Beto', toParticipantId: 'p0', toName: 'Mateo', amount: 30 },
  ],
};

const clickDeleteExpense = () => fireEvent.click(screen.getByRole('button', { name: 'Eliminar gasto de Vos' }));

describe('GatheringWorkspace', () => {
  beforeEach(() => {
    mocks.addGatheringExpense.mockReset().mockResolvedValue(undefined);
    mocks.confirm.mockReset().mockResolvedValue(true);
    mocks.deleteGatheringExpense.mockReset().mockResolvedValue(undefined);
    mocks.toggleGatheringSettled.mockReset().mockResolvedValue(undefined);
    mocks.mutate.mockReset();
    mocks.state = { gathering: detail };
  });

  it('muestra el feed, el resumen y el panel de saldar cuentas con "Vos"', () => {
    renderWithProviders(<GatheringWorkspace gatheringId="g1" />);

    expect(screen.getByRole('heading', { name: 'Asado' })).toBeInTheDocument();
    expect(screen.getByText('Carne')).toBeInTheDocument();
    expect(screen.getByText('Ana → vos')).toBeInTheDocument();
    expect(screen.getByText('+$60,00')).toBeInTheDocument();
    expect(screen.getAllByText('−$30,00')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Marcar como saldada' })).toBeInTheDocument();
  });

  it('cada saldo muestra lo que pagó y lo que gastó la persona', () => {
    renderWithProviders(<GatheringWorkspace gatheringId="g1" />);

    expect(screen.getByText('pagó $90,00 · gastó $30,00')).toBeInTheDocument();
    expect(screen.getAllByText('pagó $0,00 · gastó $30,00')).toHaveLength(2);
  });

  it('un gasto entre todos no muestra la línea "Entre"', () => {
    renderWithProviders(<GatheringWorkspace gatheringId="g1" />);

    expect(screen.queryByText(/^Entre /)).not.toBeInTheDocument();
  });

  it('un gasto parcial muestra entre quiénes se divide y cuánto es cada parte', () => {
    mocks.state = {
      gathering: {
        ...detail,
        expenses: [{ ...detail.expenses[0], amount: 27, sharedWith: ['p0', 'p2'] }],
      },
    };
    renderWithProviders(<GatheringWorkspace gatheringId="g1" />);

    expect(screen.getByText('Entre vos y Beto · $13,50 c/u')).toBeInTheDocument();
  });

  describe('composer', () => {
    const fillAmount = (value: string) =>
      fireEvent.change(screen.getByRole('textbox', { name: 'Monto' }), { target: { value } });
    const toggleSharer = (name: string) =>
      fireEvent.click(within(screen.getByRole('group', { name: 'Entre quiénes se divide' })).getByLabelText(name));

    it('arranca dividiendo entre todos y el caption sigue al monto', () => {
      renderWithProviders(<GatheringWorkspace gatheringId="g1" />);

      expect(screen.getByText('Se divide entre 3 de 3')).toBeInTheDocument();

      fillAmount('90');

      expect(screen.getByText('Se divide entre 3 de 3 · $30,00 c/u')).toBeInTheDocument();
    });

    it('sacar a alguien actualiza el caption y manda solo a los elegidos', async () => {
      renderWithProviders(<GatheringWorkspace gatheringId="g1" />);

      fillAmount('27');
      toggleSharer('Beto');

      expect(screen.getByText('Se divide entre 2 de 3 · $13,50 c/u')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Agregar gasto' }));

      await waitFor(() =>
        expect(mocks.addGatheringExpense).toHaveBeenCalledWith('g1', {
          participantId: 'p0',
          amount: 27,
          description: null,
          sharedWith: ['p0', 'p1'],
        })
      );
    });

    it('si se divide entre todos no manda sharedWith', async () => {
      renderWithProviders(<GatheringWorkspace gatheringId="g1" />);

      fillAmount('30');
      fireEvent.click(screen.getByRole('button', { name: 'Agregar gasto' }));

      await waitFor(() =>
        expect(mocks.addGatheringExpense).toHaveBeenCalledWith('g1', {
          participantId: 'p0',
          amount: 30,
          description: null,
          sharedWith: undefined,
        })
      );
    });

    it('sin nadie elegido muestra el error y no deja agregar', () => {
      renderWithProviders(<GatheringWorkspace gatheringId="g1" />);

      fillAmount('30');
      ['Vos', 'Ana', 'Beto'].forEach(toggleSharer);

      expect(screen.getByText('Elegí al menos una persona')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Agregar gasto' })).toBeDisabled();
    });
  });

  it('borrar un gasto pide confirmación y borra al confirmar', async () => {
    renderWithProviders(<GatheringWorkspace gatheringId="g1" />);

    clickDeleteExpense();

    await waitFor(() => expect(mocks.deleteGatheringExpense).toHaveBeenCalledWith('g1', 'e1'));
    expect(mocks.confirm).toHaveBeenCalledOnce();
  });

  it('si se cancela la confirmación no borra', async () => {
    mocks.confirm.mockResolvedValue(false);
    renderWithProviders(<GatheringWorkspace gatheringId="g1" />);

    clickDeleteExpense();

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledOnce());
    expect(mocks.deleteGatheringExpense).not.toHaveBeenCalled();
  });

  it('un doble clic mientras se borra no duplica el pedido', async () => {
    let finish!: () => void;
    mocks.deleteGatheringExpense.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    renderWithProviders(<GatheringWorkspace gatheringId="g1" />);

    clickDeleteExpense();
    clickDeleteExpense();
    await waitFor(() => expect(mocks.deleteGatheringExpense).toHaveBeenCalledOnce());
    clickDeleteExpense();
    await act(async () => finish());

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.deleteGatheringExpense).toHaveBeenCalledOnce();
  });

  it('marcar como saldada llama a la API con isSettled en true', async () => {
    renderWithProviders(<GatheringWorkspace gatheringId="g1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Marcar como saldada' }));

    await waitFor(() => expect(mocks.toggleGatheringSettled).toHaveBeenCalledWith('g1', { isSettled: true }));
  });

  it('una juntada saldada no deja agregar ni borrar gastos y ofrece reabrir', async () => {
    mocks.state = { gathering: { ...detail, isSettled: true } };
    renderWithProviders(<GatheringWorkspace gatheringId="g1" />);

    expect(screen.queryByRole('form', { name: 'Agregar gasto' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar gasto de Vos' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reabrir' }));

    await waitFor(() => expect(mocks.toggleGatheringSettled).toHaveBeenCalledWith('g1', { isSettled: false }));
  });

  it('con una sola persona avisa que falta gente y no muestra el composer', () => {
    mocks.state = { gathering: { ...detail, participants: [detail.participants[0]], participantCount: 1 } };
    renderWithProviders(<GatheringWorkspace gatheringId="g1" />);

    expect(screen.getByText('Falta gente para dividir')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Agregar gasto' })).not.toBeInTheDocument();
  });

  it('si falla la carga ofrece reintentar', () => {
    mocks.state = { gathering: null, error: new Error('x') };
    renderWithProviders(<GatheringWorkspace gatheringId="g1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(mocks.mutate).toHaveBeenCalledOnce();
  });
});
