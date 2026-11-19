import { FC, useState } from 'react';
import { Button, Group, Stack, Table, Text } from '@mantine/core';

import { ErrorState, LoadingState, Overline } from '@/shared/ui';

import { useGymWeightHistory, WEIGHT_HISTORY_PAGE_SIZE } from '../../hooks/useGymWeightHistory';
import { formatHistoryDate, formatVariantShort, formatWeightKg } from '../../utils/gymFormat';
import { schemeChangeNotes } from '../../utils/gymHistory';

interface WeightHistoryPageProps {
  exerciseId: string;
  page: number;
  hasNextPage: boolean;
}

/**
 * Filas de una página del historial (la primera la comparte con `WeightHistory`: SWR la pide una sola vez). Para
 * aclarar el cambio de series o repeticiones de su última fila mira la primera de la página siguiente, si ya está
 * cargada.
 */
const WeightHistoryPage: FC<WeightHistoryPageProps> = ({ exerciseId, page, hasNextPage }) => {
  const { entries, error, mutate } = useGymWeightHistory(exerciseId, page);
  const next = useGymWeightHistory(exerciseId, page + 1, hasNextPage);

  if (error) {
    return (
      <Table.Tr>
        <Table.Td colSpan={3}>
          <ErrorState message="No se pudo cargar más historial" onRetry={() => mutate()} />
        </Table.Td>
      </Table.Tr>
    );
  }
  if (!entries) {
    return (
      <Table.Tr>
        <Table.Td colSpan={3} ta="center">
          <LoadingState size="sm" py="none" />
        </Table.Td>
      </Table.Tr>
    );
  }

  const nextFirst = next.entries?.[0];
  const notes = schemeChangeNotes(nextFirst ? [...entries, nextFirst] : entries);

  return entries.map(entry => (
    <Table.Tr key={entry.id}>
      <Table.Td w="100%" p="none">
        <Group justify="space-between" wrap="nowrap" py="xs">
          <Text fw={700} w="7rem">
            {formatWeightKg(entry.weightKg)}
          </Text>
          <Text c="dimmed">{formatVariantShort(entry.sets, entry.reps)}</Text>
          <Text c="dimmed" size="xs" ta="right" w="4.5rem">
            {formatHistoryDate(entry.recordedAt)}
          </Text>
        </Group>
        {notes.has(entry.id) && (
          <Text size="xs" c="dimmed" pb="xs">
            {notes.get(entry.id)}
          </Text>
        )}
      </Table.Td>
    </Table.Tr>
  ));
};

interface WeightHistoryProps {
  exerciseId: string;
  readOnly: boolean;
}

/**
 * Historial de peso de la variante, del más nuevo al más viejo, de a 5 con "Ver más registros". Su carga y su error
 * son propios (con "Reintentar") y no bloquean el resto del modal.
 */
export const WeightHistory: FC<WeightHistoryProps> = ({ exerciseId, readOnly }) => {
  const [pages, setPages] = useState(1);
  const { total, error, mutate } = useGymWeightHistory(exerciseId, 1);

  const renderContent = () => {
    if (error) return <ErrorState message="No se pudo cargar el historial." onRetry={() => mutate()} />;
    if (total === undefined) return <LoadingState size="sm" py="sm" />;
    if (total === 0) {
      return (
        <Text size="sm" c="dimmed">
          {readOnly
            ? 'Todavía no hay registros.'
            : 'Todavía no hay registros. Cuando guardes el primer peso va a aparecer acá.'}
        </Text>
      );
    }
    return (
      <>
        <Table aria-label="Historial de peso" verticalSpacing="none" horizontalSpacing="none">
          <Table.Tbody>
            {Array.from({ length: pages }, (_, index) => (
              <WeightHistoryPage
                key={index + 1}
                exerciseId={exerciseId}
                page={index + 1}
                hasNextPage={index + 1 < pages}
              />
            ))}
          </Table.Tbody>
        </Table>
        {pages * WEIGHT_HISTORY_PAGE_SIZE < total && (
          <Button variant="subtle" size="xs" style={{ alignSelf: 'center' }} onClick={() => setPages(p => p + 1)}>
            Ver más registros
          </Button>
        )}
      </>
    );
  };

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="baseline">
        <Overline>Historial</Overline>
        {total !== undefined && total > 0 && (
          <Text size="xs" c="dimmed">
            {total === 1 ? '1 registro' : `${total} registros`}
          </Text>
        )}
      </Group>
      {renderContent()}
    </Stack>
  );
};
