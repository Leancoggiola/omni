const STORAGE_KEY = 'omni.household.pushNoticeDismissed';

/** El aviso de "sin notificaciones push" se descarta por sesión del navegador; sin `sessionStorage` vuelve a salir. */
export function isPushNoticeDismissed(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissPushNotice(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    return;
  }
}
