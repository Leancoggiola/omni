import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runColorSchemeTransition, suppressTransitionsForNextFrame } from '../colorSchemeTransition';

/** Simula `prefers-reduced-motion`. */
function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce') }));
}

describe('runColorSchemeTransition', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(document, 'startViewTransition');
  });

  it('con View Transitions aplica el cambio dentro de la transición', () => {
    stubReducedMotion(false);
    const startViewTransition = vi.fn((update: () => void) => update());
    Object.assign(document, { startViewTransition });
    const apply = vi.fn();

    runColorSchemeTransition(apply);

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('con movimiento reducido cambia sin transición', () => {
    stubReducedMotion(true);
    const startViewTransition = vi.fn();
    Object.assign(document, { startViewTransition });
    const apply = vi.fn();

    runColorSchemeTransition(apply);

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('sin View Transitions cambia al instante', () => {
    stubReducedMotion(false);
    const apply = vi.fn();

    runColorSchemeTransition(apply);

    expect(apply).toHaveBeenCalledTimes(1);
  });
});

describe('suppressTransitionsForNextFrame', () => {
  const frames: FrameRequestCallback[] = [];

  beforeEach(() => {
    frames.length = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.head.innerHTML = '';
  });

  it('apaga las transiciones hasta después del próximo cuadro', () => {
    suppressTransitionsForNextFrame();
    const style = () => document.head.querySelector('[data-omni-disable-transitions]');
    expect(style()?.textContent).toContain('transition: none');

    frames.shift()?.(0);
    expect(style()).not.toBeNull();

    frames.shift()?.(0);
    expect(style()).toBeNull();
  });
});
