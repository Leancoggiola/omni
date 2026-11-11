import { useEffect } from 'react';

import { subscribeServerWake } from '@/shared/api';
import { notifyPersistent } from '@/shared/ui';

import { SERVER_WAKE_MESSAGE } from '@omni/shared/server-wake';

/** Muestra un aviso persistente mientras la API (Render free) despierta de un cold start. No renderiza DOM propio. */
export const ServerWakeNotice = () => {
  useEffect(() => {
    let dismiss: (() => void) | null = null;
    const unsubscribe = subscribeServerWake(waking => {
      if (waking && !dismiss) {
        dismiss = notifyPersistent(SERVER_WAKE_MESSAGE);
      } else if (!waking && dismiss) {
        dismiss();
        dismiss = null;
      }
    });
    return () => {
      unsubscribe();
      dismiss?.();
    };
  }, []);

  return null;
};
