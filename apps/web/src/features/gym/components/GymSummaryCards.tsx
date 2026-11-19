import { FC } from 'react';
import { Paper, SimpleGrid, Skeleton } from '@mantine/core';

import { StatCard } from '@/shared/ui';

import type { GymPlanStats } from '../utils/gymPlanStats';

const LABELS = ['Días de entrenamiento', 'Ejercicios', 'Sin peso cargado'];

interface GymSummaryCardsProps {
  stats: GymPlanStats | undefined;
}

/** Contadores del plan elegido: días de entrenamiento, ejercicios y ejercicios sin peso cargado. */
export const GymSummaryCards: FC<GymSummaryCardsProps> = ({ stats }) => (
  <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
    {stats ? (
      <>
        <StatCard value={stats.dayCount} label={LABELS[0]!} />
        <StatCard value={stats.exerciseCount} label={LABELS[1]!} />
        <StatCard value={stats.withoutWeightCount} label={LABELS[2]!} />
      </>
    ) : (
      LABELS.map(label => (
        <Paper key={label} p="md" aria-hidden="true">
          <Skeleton h="2rem" w="2.5rem" mb="xs" />
          <Skeleton h="0.875rem" w="60%" />
        </Paper>
      ))
    )}
  </SimpleGrid>
);
