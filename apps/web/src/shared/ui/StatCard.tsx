import { FC, ReactNode } from 'react';
import { Paper, Stack, Text } from '@mantine/core';

interface StatCardProps {
  value: number;
  label: string;
  pressed?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

/** Contador grande con su etiqueta. Con `onClick` es un botón (`pressed` lo marca); sin él, un grupo estático. */
export const StatCard: FC<StatCardProps> = ({ value, label, pressed, onClick, ariaLabel }) => {
  const content: ReactNode = (
    <Stack gap="3xs">
      <Text fw={800} fz="2rem" lh={1}>
        {value}
      </Text>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
    </Stack>
  );

  if (!onClick) {
    return (
      <Paper p="md" role="group" aria-label={ariaLabel ?? label}>
        {content}
      </Paper>
    );
  }

  return (
    <Paper
      component="button"
      type="button"
      p="md"
      ta="left"
      aria-pressed={pressed}
      aria-label={ariaLabel}
      bd={pressed ? '2px solid var(--mantine-primary-color-filled)' : undefined}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      {content}
    </Paper>
  );
};
