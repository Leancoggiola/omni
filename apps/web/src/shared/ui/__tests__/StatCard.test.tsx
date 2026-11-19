import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { StatCard } from '../StatCard';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('StatCard', () => {
  it('sin onClick es un grupo estático con el valor y la etiqueta', () => {
    renderWithProviders(<StatCard value={3} label="Ejercicios" />);
    expect(screen.getByRole('group', { name: 'Ejercicios' })).toHaveTextContent('3');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('con onClick es un botón que informa si está presionado', async () => {
    const onClick = vi.fn();
    renderWithProviders(
      <StatCard value={5} label="Por vencer" pressed onClick={onClick} ariaLabel="Filtrar por vencer" />
    );
    const button = screen.getByRole('button', { name: 'Filtrar por vencer' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
