let dismissed = false;

/** El aviso de "sin notificaciones push" se descarta por sesión de la app: el estado vive en memoria. */
export function isPushNoticeDismissed(): boolean {
  return dismissed;
}

export function dismissPushNotice(): void {
  dismissed = true;
}

export function resetPushNoticeDismissal(): void {
  dismissed = false;
}
