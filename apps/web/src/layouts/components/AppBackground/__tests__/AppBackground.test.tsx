import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { AppBackground } from '../AppBackground';

describe('AppBackground', () => {
  it('es decorativo y no se anima por defecto', () => {
    const { container } = renderWithProviders(<AppBackground />);
    const root = container.querySelector('[aria-hidden]') as HTMLElement;
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root.className).not.toMatch(/animated/);
  });

  it('con animated marca el contenedor para animar las manchas', () => {
    const { container } = renderWithProviders(<AppBackground animated />);
    expect((container.querySelector('[aria-hidden]') as HTMLElement).className).toMatch(/animated/);
  });
});
