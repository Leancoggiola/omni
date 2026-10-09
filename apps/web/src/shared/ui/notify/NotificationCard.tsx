import { ActionIcon, Group, Stack, Text } from '@mantine/core';

import type { FC, ReactNode } from 'react';

import styles from './NotificationCard.module.scss';

import { CheckCircleIcon, InfoIcon, WarningCircleIcon, WarningIcon, XIcon } from '@phosphor-icons/react';

export type NotificationVariant = 'success' | 'error' | 'warning' | 'info';

const VARIANT_ICON: Record<NotificationVariant, ReactNode> = {
  success: <CheckCircleIcon weight="fill" size="1.125rem" />,
  error: <WarningIcon weight="fill" size="1.125rem" />,
  warning: <WarningCircleIcon weight="fill" size="1.125rem" />,
  info: <InfoIcon weight="fill" size="1.125rem" />,
};

interface NotificationCardProps {
  variant: NotificationVariant;
  title?: ReactNode;
  message: ReactNode;
  onClose?: () => void;
}

/** Custom notification content, wired via `renderNotification` (Mantine 9.6+). */
export const NotificationCard: FC<NotificationCardProps> = ({ variant, title, message, onClose }) => (
  <div className={styles.root} data-variant={variant}>
    <Group wrap="nowrap" align="center" gap="xs" className={styles.content}>
      <div className={styles.icon}>{VARIANT_ICON[variant]}</div>
      <Stack gap="3xs" flex={1} miw={0}>
        {title && (
          <Text fw={700} size="sm">
            {title}
          </Text>
        )}
        <Text size="sm" c="dimmed">
          {message}
        </Text>
      </Stack>
      {onClose && (
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={onClose} aria-label="Cerrar notificación">
          <XIcon size="1rem" />
        </ActionIcon>
      )}
    </Group>
  </div>
);
