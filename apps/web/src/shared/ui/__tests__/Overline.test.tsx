import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { Overline } from '../Overline';

import { screen } from '@testing-library/react';

describe('Overline', () => {
  it('muestra su texto', () => {
    renderWithProviders(<Overline>Historial</Overline>);
    expect(screen.getByText('Historial')).toBeInTheDocument();
  });
});
