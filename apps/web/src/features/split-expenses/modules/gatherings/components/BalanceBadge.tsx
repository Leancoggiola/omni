import { FC } from 'react';
import { Badge, type BadgeProps } from '@mantine/core';

import { type BalanceTone, describeMyBalance } from '../utils/gatheringView';

const BADGE_COLORS: Record<BalanceTone, BadgeProps['color']> = {
  success: 'sage',
  accent: 'terracotta',
  dimmed: 'gray',
};

interface BalanceBadgeProps {
  balance: number | null;
}

/** Saldo propio de una juntada: "Te deben $X" (éxito), "Debés $X" (acento) o neutro si está parejo o no hay "Vos". */
export const BalanceBadge: FC<BalanceBadgeProps> = ({ balance }) => {
  const { label, tone } = describeMyBalance(balance);

  return (
    <Badge variant="light" color={BADGE_COLORS[tone]} size="md" tt="none" style={{ alignSelf: 'flex-start' }}>
      {label}
    </Badge>
  );
};
