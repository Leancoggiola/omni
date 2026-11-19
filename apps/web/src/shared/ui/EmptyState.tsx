import { FC, ReactNode } from 'react';
import { EmptyState as MantineEmptyState, Paper } from '@mantine/core';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  /** Rendered inside the empty state actions area, typically a Button. */
  action?: ReactNode;
}

export const EmptyState: FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <Paper p="xl">
    <MantineEmptyState
      icon={icon}
      title={title}
      description={description}
      withIndicatorBackground
      size="md"
      align="center"
    >
      {action && <MantineEmptyState.Actions>{action}</MantineEmptyState.Actions>}
    </MantineEmptyState>
  </Paper>
);
