import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { PasswordField } from '../PasswordField';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('PasswordField', () => {
  it('anuncia el ojo en español y alterna entre mostrar y ocultar', async () => {
    renderWithProviders(<PasswordField label="Contraseña" />);

    const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' });
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');

    await userEvent.click(toggle);

    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text');
  });

  it('pasa el ref al input', () => {
    const ref = createRef<HTMLInputElement>();
    renderWithProviders(<PasswordField label="Contraseña" ref={ref} />);

    expect(ref.current).toBe(screen.getByLabelText('Contraseña'));
  });
});
