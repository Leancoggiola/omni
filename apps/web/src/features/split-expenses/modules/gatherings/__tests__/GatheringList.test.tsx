import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { GatheringList } from '../components/GatheringList';

import { fireEvent, screen } from '@testing-library/react';

describe('GatheringList', () => {
  it('si falla la carga ofrece reintentar', () => {
    const onRetry = vi.fn();
    renderWithProviders(
      <GatheringList items={[]} isLoading={false} error={new Error('x')} onRetry={onRetry} onNewGathering={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
