import type { Icon } from 'phosphor-react-native';

export type ActionSheetOption<T extends string = string> = {
  value: T;
  label: string;
  icon?: Icon;
};

export type ActionSheetOptions<T extends string = string> = {
  title: string;
  description?: string;
  options: readonly ActionSheetOption<T>[];
  /** Opción actual: se marca con el check. */
  value?: T;
  cancelLabel?: string;
};

export type ActionSheetRequest = Required<Omit<ActionSheetOptions, 'description' | 'value'>> &
  Pick<ActionSheetOptions, 'description' | 'value'> & {
    resolve: (value: string | null) => void;
  };

const DEFAULT_CANCEL_LABEL = 'Cancelar';

let openActionSheet: ((request: ActionSheetRequest) => void) | null = null;

export function registerActionSheetHandler(handler: (request: ActionSheetRequest) => void): () => void {
  openActionSheet = handler;
  return () => {
    if (openActionSheet === handler) openActionSheet = null;
  };
}

/**
 * Elegir una opción en un bottom sheet (reemplaza a `Alert.alert` con opciones, que en Android pierde
 * "Cancelar"). Resuelve el `value` elegido, o `null` al cancelar (botón, overlay, gesto o Atrás).
 */
export function actionSheet<T extends string>(options: ActionSheetOptions<T>): Promise<T | null> {
  if (!openActionSheet) {
    // Mismo criterio que confirm(): sin provider no se rompe el flujo, se toma como cancelar.
    if (__DEV__) console.warn('actionSheet() requiere ActionSheetProvider montado en app/_layout.tsx.');
    return Promise.resolve(null);
  }

  if (__DEV__ && new Set(options.options.map(option => option.value)).size !== options.options.length) {
    // El value es la key de cada fila y lo que se resuelve: repetidos marcan el check dos veces.
    console.warn(`actionSheet("${options.title}"): las opciones tienen values repetidos.`);
  }

  return new Promise<T | null>(resolve => {
    openActionSheet!({
      title: options.title,
      description: options.description,
      options: options.options,
      value: options.value,
      cancelLabel: options.cancelLabel ?? DEFAULT_CANCEL_LABEL,
      // Solo se resuelve con un `value` de `options` o con null.
      resolve: resolve as (value: string | null) => void,
    });
  });
}
