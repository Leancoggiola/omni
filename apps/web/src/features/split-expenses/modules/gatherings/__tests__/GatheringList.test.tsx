import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { GatheringList } from '../components/GatheringList/GatheringList';

import type { GatheringSummary } from '@omni/shared/split-expenses';

import { fireEvent, screen } from '@testing-library/react';

const gathering = (overrides: Partial<GatheringSummary>): GatheringSummary => ({
  id: 'g1',
  name: 'Asado',
  date: '2026-10-18',
  isSettled: false,
  participantCount: 4,
  totalAmount: 96000,
  myBalance: 24000,
  ...overrides,
});

describe('GatheringList', () => {
  it('separa Activas y Saldadas y muestra el saldo propio de cada una', () => {
    renderWithProviders(
      <GatheringList
        items={[
          gathering({ id: 'a', name: 'Asado', myBalance: 24000 }),
          gathering({ id: 'b', name: 'Finde', myBalance: -12500 }),
          gathering({ id: 'c', name: 'Cumple', isSettled: true }),
        ]}
        selectedId="a"
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Activas')).toBeInTheDocument();
    expect(screen.getByText('Saldadas')).toBeInTheDocument();
    expect(screen.getByText('Te deben $24.000,00')).toBeInTheDocument();
    expect(screen.getByText('Debés $12.500,00')).toBeInTheDocument();
    expect(screen.getByText('Saldada')).toBeInTheDocument();
    expect(screen.getAllByText('18/10')).toHaveLength(2);
  });

  it('una juntada anterior a "Vos" (saldo null) muestra "Sin saldo propio"', () => {
    renderWithProviders(<GatheringList items={[gathering({ myBalance: null })]} selectedId="g1" onSelect={vi.fn()} />);

    expect(screen.getByText('Sin saldo propio')).toBeInTheDocument();
  });

  it('marca la elegida y avisa al clickear otra', () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <GatheringList
        items={[gathering({ id: 'a', name: 'Asado' }), gathering({ id: 'b', name: 'Finde' })]}
        selectedId="a"
        onSelect={onSelect}
      />
    );

    expect(screen.getByRole('button', { name: /Asado/ })).toHaveAttribute('aria-current', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Finde/ }));

    expect(onSelect).toHaveBeenCalledWith('b');
  });
});
