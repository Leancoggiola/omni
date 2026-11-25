import { ignoreError } from '@omni/shared/common';
import { ThemeProvider } from 'expo-router/react-navigation';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { TamaguiProvider, Theme } from 'tamagui';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { SEMANTIC } from '@omni/shared/theme';

import type { ProfileTheme } from '@omni/shared/users';

import { AuthProvider, useProfileColorScheme } from '@/core/auth';
import { AuthGate } from '@/core/authGate';
import { BiometricsProvider } from '@/core/biometrics';
import { LaunchSplash, useLaunchState } from '@/core/launch';
import { SWRProvider } from '@/core/providers';
import { ServerWakeNotice } from '@/core/serverWake';
import { ColorSchemeProvider, useColorSchemeControl } from '@/core/theme';
import { NAVIGATION_THEMES } from '@/theme/navigationTheme';
import { BRICOLAGE_FACES, MONTSERRAT_FACES } from '@/theme/fonts';
import { tamaguiConfig } from '@/theme/tamagui.config';
import { readColorSchemeHint } from '@/shared/api';
import { ActionSheetProvider, ConfirmProvider, NotificationsProvider } from '@/shared/ui';

/**
 * La splash nativa queda visible hasta que `LaunchSplash` dibuja su primer cuadro, que es igual, y ahí se va sin
 * fundido (el de Android es de 400 ms y dejaría ver el logo quieto sobre el que gira). `preventAutoHideAsync` puede
 * rechazar si ya no hay splash que retener (ej. fast refresh): no es un error para la app.
 */
function holdSplash() {
  SplashScreen.setOptions({ duration: 0, fade: false });
  SplashScreen.preventAutoHideAsync().catch(ignoreError);
}

holdSplash();

/**
 * Alimenta `ColorSchemeProvider` con el tema del perfil de la sesión (`useProfileColorScheme`). Mientras dura la
 * animación de arranque el tema se aplica sin fundido: lo tapa la animación y la captura la congelaría.
 */
function ProfileColorSchemeProvider({
  initialHint,
  children,
}: PropsWithChildren<{ initialHint: ProfileTheme | null }>) {
  const profileTheme = useProfileColorScheme(initialHint);
  const { finished } = useLaunchState();

  return (
    <ColorSchemeProvider profileTheme={profileTheme} instant={!finished}>
      {children}
    </ColorSchemeProvider>
  );
}

/**
 * Aplica el tema a React Navigation, Tamagui y la status bar. El fondo de la ventana nativa (el que asoma detrás de
 * la app, por ejemplo al abrir el teclado) sigue al tema con `expo-system-ui`.
 */
function ThemedRoot({ children }: PropsWithChildren) {
  const { colorScheme } = useColorSchemeControl();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(SEMANTIC[colorScheme].body);
  }, [colorScheme]);

  return (
    <ThemeProvider value={NAVIGATION_THEMES[colorScheme]}>
      <Theme name={colorScheme}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        {children}
      </Theme>
    </ThemeProvider>
  );
}

/**
 * Sin las fuentes, el primer render saldría con la tipografía del sistema y saltaría al cargarlas; mientras
 * tanto se ve la splash. Si fallan se sigue con la del sistema en vez de quedar en blanco. La splash también espera
 * la pista de tema (`readColorSchemeHint`, nunca rechaza), así el primer cuadro sale con el tema del perfil. Con las
 * dos resueltas se monta la app con `LaunchSplash` encima, que es quien oculta la splash nativa.
 */
export default function RootLayout() {
  const systemScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({ ...MONTSERRAT_FACES, ...BRICOLAGE_FACES });
  const fontsSettled = fontsLoaded || !!fontError;
  const [colorSchemeHint, setColorSchemeHint] = useState<ProfileTheme | null>();
  const ready = fontsSettled && colorSchemeHint !== undefined;

  useEffect(() => {
    void readColorSchemeHint().then(setColorSchemeHint);
  }, []);

  if (!ready) return null;

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={systemScheme === 'dark' ? 'dark' : 'light'}>
      <SWRProvider>
        <AuthProvider>
          <BiometricsProvider>
            <ProfileColorSchemeProvider initialHint={colorSchemeHint}>
              <ThemedRoot>
                <NotificationsProvider>
                  <ConfirmProvider>
                    <ActionSheetProvider>
                      <AuthGate />
                      <LaunchSplash />
                      <ServerWakeNotice />
                    </ActionSheetProvider>
                  </ConfirmProvider>
                </NotificationsProvider>
              </ThemedRoot>
            </ProfileColorSchemeProvider>
          </BiometricsProvider>
        </AuthProvider>
      </SWRProvider>
    </TamaguiProvider>
  );
}
