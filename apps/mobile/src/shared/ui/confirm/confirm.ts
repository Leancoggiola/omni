export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `true` por defecto, como el modal de web: el botón de confirmar va en rojo. */
  destructive?: boolean;
};

export type ConfirmRequest = Required<Omit<ConfirmOptions, 'destructive'>> & {
  destructive: boolean;
  resolve: (value: boolean) => void;
};

const DEFAULT_CONFIRM_LABEL = 'Confirmar';
const DEFAULT_CANCEL_LABEL = 'Cancelar';

let openConfirm: ((request: ConfirmRequest) => void) | null = null;

export function registerConfirmHandler(handler: (request: ConfirmRequest) => void): () => void {
  openConfirm = handler;
  return () => {
    if (openConfirm === handler) openConfirm = null;
  };
}

/**
 * Muestra un Sheet de confirmación global (misma API que `confirm` de web).
 * Resuelve `true` al confirmar y `false` al cancelar (botón, overlay o deslizar hacia abajo).
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  if (!openConfirm) {
    return Promise.reject(new Error('confirm() requiere ConfirmProvider montado en app/_layout.tsx.'));
  }

  return new Promise<boolean>(resolve => {
    openConfirm!({
      title: options.title,
      description: options.description,
      confirmLabel: options.confirmLabel ?? DEFAULT_CONFIRM_LABEL,
      cancelLabel: options.cancelLabel ?? DEFAULT_CANCEL_LABEL,
      destructive: options.destructive ?? true,
      resolve,
    });
  });
}
