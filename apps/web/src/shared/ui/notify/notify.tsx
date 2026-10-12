import { notifications } from '@mantine/notifications';

import { NotificationCard } from './NotificationCard';

import type { NotificationVariant } from './NotificationCard';

function showNotification(
  variant: NotificationVariant,
  title: string,
  message: string,
  priority: number,
  autoClose?: false
) {
  const id = notifications.show({
    message: '',
    priority,
    ...(autoClose === false && { autoClose }),
    renderNotification: () => (
      <NotificationCard variant={variant} title={title} message={message} onClose={() => notifications.hide(id)} />
    ),
  });
  return id;
}

export function notifySuccess(message: string) {
  showNotification('success', 'Listo', message, 0);
}

export function notifyError(message: string) {
  showNotification('error', 'Error', message, 10);
}

export function notifyWarning(message: string) {
  showNotification('warning', 'Atención', message, 5);
}

export function notifyInfo(message: string) {
  showNotification('info', 'Info', message, 0);
}

/** Aviso informativo que no se cierra solo; devuelve la función que lo cierra. */
export function notifyPersistent(message: string): () => void {
  const id = showNotification('info', 'Info', message, 0, false);
  return () => notifications.hide(id);
}

export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
