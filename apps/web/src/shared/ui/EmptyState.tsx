import { CSSProperties, FC, ReactNode } from 'react';
import { EmptyState as MantineEmptyState, Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';

/** Mantine dibuja el círculo al doble del ícono: 1.75rem da un círculo de 56 px con ícono de 28 px, como mobile. */
const INDICATOR_STYLE = { '--empty-state-indicator-size': '1.75rem' } as CSSProperties;

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  /** Rendered inside the empty state actions area, typically a Button. */
  action?: ReactNode;
  compact?: boolean;
}

/**
 * Estado vacío compartido, centrado en su propio `Paper`. `compact` es una fila baja (ícono chico a la izquierda y
 * texto con la acción al lado) sin superficie propia, para meterla dentro de la card de un widget.
 */
export const EmptyState: FC<EmptyStateProps> = ({ icon, title, description, action, compact = false }) => {
  if (compact) {
    return (
      <Group wrap="nowrap" gap="sm" align="flex-start">
        <ThemeIcon
          variant="transparent"
          bg="var(--mantine-color-surfaces-card)"
          c="var(--mantine-color-text-primary)"
          size="2.75rem"
          radius="full"
          aria-hidden
        >
          {icon}
        </ThemeIcon>
        <Stack gap="xs" align="flex-start" flex={1} miw={0}>
          <Stack gap="3xs">
            <Text size="sm" fw={600}>
              {title}
            </Text>
            {description && (
              <Text size="xs" c="dimmed">
                {description}
              </Text>
            )}
          </Stack>
          {action}
        </Stack>
      </Group>
    );
  }

  return (
    <Paper p="xl">
      <MantineEmptyState
        icon={icon}
        title={title}
        description={description}
        withIndicatorBackground
        size="md"
        align="center"
        style={INDICATOR_STYLE}
      >
        {action && <MantineEmptyState.Actions>{action}</MantineEmptyState.Actions>}
      </MantineEmptyState>
    </Paper>
  );
};
