export type NotificationVariant = 'success' | 'error' | 'warning' | 'info';

export type NotificationRequest = {
  id: number;
  variant: NotificationVariant;
  title: string;
  message: string;
};

/** Mismo `autoClose` que el default de Mantine en web; los errores quedan el doble para poder leerlos. */
const AUTO_CLOSE_MS = 4000;
const ERROR_AUTO_CLOSE_MS = 8000;
const MAX_VISIBLE = 3;

export function autoCloseMs(variant: NotificationVariant): number {
  return variant === 'error' ? ERROR_AUTO_CLOSE_MS : AUTO_CLOSE_MS;
}

/**
 * Agrega `request` respetando `MAX_VISIBLE`. Al llenarse se descarta la más vieja que no sea un
 * error: un `notifyError` sin leer no se pierde por un éxito posterior.
 */
export function enqueueNotification(items: NotificationRequest[], request: NotificationRequest): NotificationRequest[] {
  const next = [...items, request];
  if (next.length <= MAX_VISIBLE) return next;
  const evict = next.findIndex(item => item.variant !== 'error');
  return next.filter((_, index) => index !== (evict === -1 ? 0 : evict));
}

let showHandler: ((request: NotificationRequest) => void) | null = null;
let nextId = 0;

export function registerNotificationHandler(handler: (request: NotificationRequest) => void): () => void {
  showHandler = handler;
  return () => {
    if (showHandler === handler) showHandler = null;
  };
}

function show(variant: NotificationVariant, title: string, message: string) {
  if (!showHandler) {
    if (__DEV__) console.warn('notify*() requiere NotificationsProvider montado en app/_layout.tsx.');
    return;
  }
  showHandler({ id: ++nextId, variant, title, message });
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
