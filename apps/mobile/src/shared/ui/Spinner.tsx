import { Spinner as TamaguiSpinner, type SpinnerProps } from 'tamagui';

/**
 * Spinner con el color de marca por defecto. Tamagui no aplica `defaultProps` del config a su
 * Spinner, así que el color va acá. Dentro de un botón filled se pasa `color="$color"` (toma el
 * `onPrimary` del theme del botón).
 */
export function Spinner({ color = '$primary', ...props }: SpinnerProps) {
  return (
    <TamaguiSpinner color={color} accessible accessibilityRole="progressbar" accessibilityLabel="Cargando" {...props} />
  );
}
