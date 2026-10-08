export type NotificationVariant = 'success' | 'error' | 'warning' | 'info';

export type NotificationRequest = {
  id: number;
  variant: NotificationVariant;
  title: string;
  message: string;
};

let showHandler: ((request: NotificationRequest) => void) | null = null;
let nextId = 0;

export function registerNotificationHandler(handler: (request: NotificationRequest) => void): () => void {
  showHandler = handler;
  return () => {
    if (showHandler === handler) showHandler = null;
  };
}

function show(variant: NotificationVariant, title: string, message: string) {
  // Sin provider montado (p. ej. en un test) la notificación se descarta: no es un error de la acción.
  showHandler?.({ id: ++nextId, variant, title, message });
}

/** Mismos títulos que `notify*` de web. */
export function notifySuccess(message: string) {
  show('success', 'Listo', message);
}

export function notifyError(message: string) {
  show('error', 'Error', message);
}

export function notifyWarning(message: string) {
  show('warning', 'Atención', message);
}

export function notifyInfo(message: string) {
  show('info', 'Info', message);
}

export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
