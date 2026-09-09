import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';

import { router } from '@/app/router';
import { AuthProvider } from '@/core/auth';
import { SWRProvider } from '@/core/providers';
import { ConfirmProvider, LightboxProvider } from '@/shared/ui';
import { THEME } from '@/theme/config';
import { cssVariablesResolver } from '@/theme/css-variables';

import '@/shared/dates/dayjs';

import '@mantine/core/styles.layer.css';
import '@mantine/dates/styles.layer.css';
import '@mantine/lightbox/styles.layer.css';
import '@mantine/notifications/styles.layer.css';

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <MantineProvider theme={THEME} cssVariablesResolver={cssVariablesResolver} deduplicateInlineStyles>
      <DatesProvider settings={{ locale: 'es', firstDayOfWeek: 1 }}>
        <Notifications layout="stacked" />
        <LightboxProvider />
        <ConfirmProvider>
          <SWRProvider>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </SWRProvider>
        </ConfirmProvider>
      </DatesProvider>
    </MantineProvider>
  </StrictMode>
);
