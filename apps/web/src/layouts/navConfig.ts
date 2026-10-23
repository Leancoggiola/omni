import type { ReactNode } from 'react';

export interface NavItemConfig {
  label: string;
  path?: string;
  disabled?: boolean;
  icon: ReactNode;
}
