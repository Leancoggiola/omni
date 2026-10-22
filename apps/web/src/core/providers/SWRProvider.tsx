import { FC, PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';

import { fetcher } from '@/shared/api';

import { SWR_RETRY_OPTIONS } from '@omni/shared/api';

/**
 * Configuración global de SWR: el `fetcher` del client, sin revalidar al volver el foco y la política de reintentos
 * compartida con mobile (`SWR_RETRY_OPTIONS`: 3 reintentos, salvo los 4xx que no son 408 ni 429).
 */
export const SWRProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        ...SWR_RETRY_OPTIONS,
      }}
    >
      {children}
    </SWRConfig>
  );
};
