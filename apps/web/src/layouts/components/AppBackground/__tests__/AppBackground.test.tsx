import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { AppBackground } from '../AppBackground';

import { screen } from '@testing-library/react';

describe('AppBackground', () => {
  it('es decorativo y no se anima por defecto', () => {
    renderWithProviders(<AppBackground />);
    const root = screen.getByTestId('app-background');
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root.className).not.toMatch(/animated/);
  });

  it('con animated marca el contenedor para animar las manchas', () => {
    renderWithProviders(<AppBackground animated />);
    expect(screen.getByTestId('app-background').className).toMatch(/animated/);
  });
});
