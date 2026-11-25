import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ColorSchemeSync } from '../ColorSchemeSync';

import { render } from '@testing-library/react';

const listeners = new Set<() => void>();
const suppress = vi.fn();

vi.mock('../useSyncColorScheme', () => ({ useSyncColorScheme: vi.fn() }));
vi.mock('../colorSchemeTransition', () => ({ suppressTransitionsForNextFrame: () => suppress() }));

describe('ColorSchemeSync', () => {
  beforeEach(() => {
    suppress.mockClear();
    listeners.clear();
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('apaga las transiciones cuando cambia el tema del sistema', () => {
    render(<ColorSchemeSync />);
    listeners.forEach(cb => cb());
    expect(suppress).toHaveBeenCalledTimes(1);
  });

  it('deja de escuchar al desmontarse', () => {
    const { unmount } = render(<ColorSchemeSync />);
    unmount();
    expect(listeners.size).toBe(0);
  });
});
