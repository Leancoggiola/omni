import { Fab, FAB_SIZE as SHARED_FAB_SIZE } from '@/shared/ui';

export const FAB_SIZE = SHARED_FAB_SIZE;

type AddMediaFabProps = {
  onPress: () => void;
};

/** Botón flotante de "Agregar" de Media: el `Fab` compartido con su etiqueta. */
export function AddMediaFab({ onPress }: AddMediaFabProps) {
  return <Fab onPress={onPress} accessibilityLabel="Agregar película o serie" />;
}
