import { MantineProvider } from '@mantine/core';
import { SWRConfig } from 'swr';

import type { ReactElement, ReactNode } from 'react';

import { render, type RenderOptions } from '@testing-library/react';

interface ProvidersOptions {
  withSwr?: boolean;
}

export function renderWithProviders(ui: ReactElement, options?: RenderOptions & ProvidersOptions) {
  const { withSwr = false, ...renderOptions } = options ?? {};

  function Wrapper({ children }: { children: ReactNode }) {
    const content = withSwr ? <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig> : children;
    return <MantineProvider deduplicateInlineStyles>{content}</MantineProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
