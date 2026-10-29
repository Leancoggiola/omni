import { FC, ReactNode } from 'react';
import { EmptyState as MantineEmptyState, Paper } from '@mantine/core';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  /** Rendered inside the empty state actions area, typically a Button. */
  action?: ReactNode;
}

export const EmptyState: FC<EmptyStateProps> = ({ icon, title, action }) => (
  <Paper p="xl" radius="md" withBorder>
    <MantineEmptyState icon={icon} title={title} withIndicatorBackground size="md" align="center">
      {action && <MantineEmptyState.Actions>{action}</MantineEmptyState.Actions>}
    </MantineEmptyState>
  </Paper>
);
