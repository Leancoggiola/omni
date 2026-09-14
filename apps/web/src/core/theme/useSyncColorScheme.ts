import { useEffect, useRef } from 'react';
import { useMantineColorScheme } from '@mantine/core';

import { useAuth } from '@/core/auth';

export function useSyncColorScheme() {
  const { user } = useAuth();
  const { setColorScheme } = useMantineColorScheme();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (syncedRef.current) return;
    if (!user) return;

    setColorScheme(user.theme);
    syncedRef.current = true;
  }, [user, setColorScheme]);
}
