import { FC } from 'react';
import { Badge, Button, Group, Paper, ScrollArea, Skeleton, Stack, Text, UnstyledButton } from '@mantine/core';

import { CATALOG_MIN_QUERY_LENGTH } from '../../hooks/useGymCatalog';
import { formatSetsAndReps, formatWeightKg } from '../../utils/gymFormat';

import type { GymCatalogExercise } from '@omni/shared/gym';

import { GYM_CATALOG_MAX_LIMIT } from '@omni/shared/gym';

interface CatalogResultsProps {
  query: string;
  queried: boolean;
  searching: boolean;
  failed: boolean;
  suggestions: GymCatalogExercise[];
  matchedId: string | undefined;
  onSelect: (variant: GymCatalogExercise) => void;
  onRetry: () => void;
}

/**
 * Lo que sale de buscar en el catálogo, debajo del campo Nombre: la ayuda (menos de 2 letras), 2 filas de carga, el
 * error con "Reintentar" (no bloquea agregar), "Sin resultados" o la lista (con scroll interno; si vuelven 20 cierra
 * con un aviso). Elegir una variante completa nombre, series y repeticiones.
 */
export const CatalogResults: FC<CatalogResultsProps> = ({
  query,
  queried,
  searching,
  failed,
  suggestions,
  matchedId,
  onSelect,
  onRetry,
}) => {
  if (!queried) {
    return (
      <Text size="sm" c="dimmed">
        {`Escribí al menos ${CATALOG_MIN_QUERY_LENGTH} letras para buscar en tu catálogo.`}
      </Text>
    );
  }
  if (searching) {
    return (
      <Stack gap="xs" role="status" aria-label="Buscando en tu catálogo">
        <Skeleton h="2.75rem" radius="md" />
        <Skeleton h="2.75rem" radius="md" />
      </Stack>
    );
  }
  if (failed) {
    return (
      <Group gap="sm" justify="space-between" wrap="nowrap" role="alert">
        <Text size="sm" c="dimmed">
          No pudimos buscar en tu catálogo. Podés cargarlo igual.
        </Text>
        <Button variant="default" size="xs" onClick={onRetry}>
          Reintentar
        </Button>
      </Group>
    );
  }
  if (suggestions.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {`Sin resultados para «${query.trim()}» en tu catálogo.`}
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      <Paper withBorder p="xs">
        <ScrollArea.Autosize mah="14rem">
          <Stack gap="3xs" role="group" aria-label="Ejercicios de tu catálogo">
            {suggestions.map(variant => (
              <UnstyledButton
                key={variant.id}
                onClick={() => onSelect(variant)}
                aria-pressed={variant.id === matchedId}
                aria-label={`${variant.name}, ${formatSetsAndReps(variant.sets, variant.reps)}, ${
                  variant.currentWeightKg === null ? 'sin peso' : formatWeightKg(variant.currentWeightKg)
                }`}
                p="xs"
                bg={variant.id === matchedId ? 'var(--mantine-color-surfaces-accent-light)' : undefined}
                style={{ borderRadius: 'var(--mantine-radius-md)' }}
              >
                <Group justify="space-between" wrap="nowrap" gap="sm">
                  <Stack gap="none" miw={0}>
                    <Text size="sm" fw={600} lineClamp={1}>
                      {variant.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatSetsAndReps(variant.sets, variant.reps)}
                    </Text>
                  </Stack>
                  <Badge
                    size="sm"
                    variant="light"
                    color={variant.currentWeightKg === null ? 'gray' : 'terracotta'}
                    style={{ flexShrink: 0 }}
                  >
                    {variant.currentWeightKg === null ? 'Sin peso' : formatWeightKg(variant.currentWeightKg)}
                  </Badge>
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </ScrollArea.Autosize>
      </Paper>
      {suggestions.length >= GYM_CATALOG_MAX_LIMIT && (
        <Text size="xs" c="dimmed">
          {`Mostramos ${GYM_CATALOG_MAX_LIMIT} coincidencias. Escribí más para afinar la búsqueda.`}
        </Text>
      )}
    </Stack>
  );
};
