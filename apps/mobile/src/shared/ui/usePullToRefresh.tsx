import { useCallback, useRef, useState, type ReactElement } from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';

import { useSemanticColors } from '@/core/theme';

/**
 * `refreshControl` de un `ScrollView`/`FlatList` para "tirar para actualizar". El indicador solo refleja el gesto:
 * una revalidación de SWR por volver a primer plano no lo muestra. Un segundo gesto mientras hay uno en curso se
 * ignora, y `refresh` puede rechazar sin dejar el indicador colgado (el error lo muestra la pantalla).
 */
export function usePullToRefresh(refresh: () => Promise<unknown>): ReactElement<RefreshControlProps> {
  const colors = useSemanticColors();
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const onRefresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      await refresh();
    } catch {
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, [refresh]);

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
      colors={[colors.primaryFill]}
      tintColor={colors.primaryFill}
      progressBackgroundColor={colors.card}
    />
  );
}
