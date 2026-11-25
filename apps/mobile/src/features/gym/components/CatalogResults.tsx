import { GYM_CATALOG_MAX_LIMIT } from '@omni/shared/gym';
import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { ScrollView } from 'react-native';
import { YStack } from 'tamagui';

import { Button, LoadingState, Paragraph } from '@/shared/ui';

import { CATALOG_MIN_QUERY_LENGTH } from '../hooks/useGymCatalogSuggestions';
import { CatalogSuggestionRow } from './CatalogSuggestionRow';

import type { GymCatalogExercise } from '@omni/shared/gym';

const LIST_MAX_HEIGHT = 200;

type CatalogResultsProps = {
  query: string;
  queried: boolean;
  searching: boolean;
  failed: boolean;
  suggestions: readonly GymCatalogExercise[];
  matchedId: string | undefined;
  onSelect: (suggestion: GymCatalogExercise) => void;
  onRetry: () => void;
};

/**
 * Lo que sale de buscar en el catálogo, debajo del campo Nombre: la ayuda (menos de 2 letras), 2 filas de carga, el
 * error con "Reintentar" (no bloquea agregar), "Sin resultados" o la lista (con scroll interno; si vuelven 20 cierra
 * con un aviso). Elegir una variante completa nombre, series y repeticiones.
 */
export function CatalogResults({
  query,
  queried,
  searching,
  failed,
  suggestions,
  matchedId,
  onSelect,
  onRetry,
}: CatalogResultsProps) {
  if (!queried) {
    return (
      <Paragraph color="dimmed" fontSize={FONT_SIZE.md}>
        {`Escribí al menos ${CATALOG_MIN_QUERY_LENGTH} letras para buscar en tu catálogo.`}
      </Paragraph>
    );
  }
  if (searching) return <LoadingState variant="skeleton" rows={2} />;
  if (failed) {
    return (
      <YStack gap={SPACING.xs}>
        <Paragraph color="dimmed" fontSize={FONT_SIZE.md}>
          No pudimos buscar en tu catálogo. Podés cargarlo igual.
        </Paragraph>
        <Button variant="outline" onPress={onRetry}>
          Reintentar
        </Button>
      </YStack>
    );
  }
  if (suggestions.length === 0) {
    return (
      <Paragraph color="dimmed" fontSize={FONT_SIZE.md}>
        {`Sin resultados para «${query.trim()}» en tu catálogo.`}
      </Paragraph>
    );
  }

  return (
    <YStack gap={SPACING.xs}>
      <ScrollView
        nestedScrollEnabled
        style={{ maxHeight: LIST_MAX_HEIGHT }}
        accessibilityRole="list"
        accessibilityLabel="Ejercicios de tu catálogo"
      >
        {suggestions.map(suggestion => (
          <CatalogSuggestionRow
            key={suggestion.id}
            suggestion={suggestion}
            selected={suggestion.id === matchedId}
            onPress={onSelect}
          />
        ))}
      </ScrollView>
      {suggestions.length >= GYM_CATALOG_MAX_LIMIT ? (
        <Paragraph color="dimmed" fontSize={FONT_SIZE.sm}>
          {`Mostramos ${GYM_CATALOG_MAX_LIMIT} coincidencias. Escribí más para afinar la búsqueda.`}
        </Paragraph>
      ) : null}
    </YStack>
  );
}
