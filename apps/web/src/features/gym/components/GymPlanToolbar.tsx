import { FC } from 'react';
import { Group, Paper, SegmentedControl, Select } from '@mantine/core';

import { isGymPlanStatus } from '../utils/gymGuards';

import type { GymPlanStatus, GymPlanSummary } from '@omni/shared/gym';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'ARCHIVED', label: 'Archivados' },
];

interface GymPlanToolbarProps {
  plans: GymPlanSummary[];
  selected: GymPlanSummary | null;
  status: GymPlanStatus;
  onSelect: (planId: string) => void;
  onStatusChange: (status: GymPlanStatus) => void;
}

/** Select del plan (de los del estado elegido) y el selector Activos / Archivados. */
export const GymPlanToolbar: FC<GymPlanToolbarProps> = ({ plans, selected, status, onSelect, onStatusChange }) => (
  <Paper p="md">
    <Group gap="md" wrap="wrap">
      <Select
        aria-label="Plan"
        data={plans.map(plan => ({ value: plan.id, label: plan.name }))}
        value={selected?.id ?? null}
        onChange={value => value && onSelect(value)}
        allowDeselect={false}
        disabled={plans.length === 0}
        placeholder={status === 'ARCHIVED' ? 'Sin planes archivados' : 'Sin planes activos'}
        w={{ base: '100%', xs: '20rem' }}
        size="md"
      />
      <SegmentedControl
        aria-label="Estado de los planes"
        data={STATUS_OPTIONS}
        value={status}
        onChange={value => isGymPlanStatus(value) && onStatusChange(value)}
      />
    </Group>
  </Paper>
);
