import type { ConfirmOptions, ConfirmRequest } from './types';

const DEFAULT_CONFIRM_LABEL = 'Confirmar';
const DEFAULT_CANCEL_LABEL = 'Cancelar';

let openConfirm: ((request: ConfirmRequest) => void) | null = null;

export function registerConfirmHandler(handler: (request: ConfirmRequest) => void): () => void {
  openConfirm = handler;
  return () => {
    if (openConfirm === handler) {
      openConfirm = null;
    }
  };
}

/**
 * Muestra un modal de confirmación global.
 * Resuelve `true` al confirmar y `false` al cancelar (botón, X o clic fuera).
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  if (!openConfirm) {
    return Promise.reject(new Error('confirm() requiere ConfirmProvider montado en el árbol de la app (main.tsx).'));
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
