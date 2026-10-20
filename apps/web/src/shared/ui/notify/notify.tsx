import { notifications } from '@mantine/notifications';

import { ApiError } from '@/shared/api';

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

/** Aviso informativo que no se cierra solo; devuelve la función que lo cierra. */
export function notifyPersistent(message: string): () => void {
  const id = showNotification('info', 'Info', message, 0, false);
  return () => notifications.hide(id);
}

/**
 * Mensaje para mostrar al usuario: el de la API (`ApiError`, ya en español) o `fallback`. Un error de red, de parseo
 * o cualquier otro llega con un mensaje técnico y en inglés ("Failed to fetch"), así que no se muestra.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError && err.message ? err.message : fallback;
}
