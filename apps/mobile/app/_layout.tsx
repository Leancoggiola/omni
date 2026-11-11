import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { TamaguiProvider, Theme } from 'tamagui';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/core/auth';
import { AuthGate } from '@/core/authGate';
import { SWRProvider } from '@/core/providers';
import { ServerWakeNotice } from '@/core/serverWake';
import { ColorSchemeProvider, useColorSchemeControl } from '@/core/theme';
import { NAVIGATION_THEMES } from '@/theme/navigationTheme';
import { BRICOLAGE_FACES, MONTSERRAT_FACES } from '@/theme/fonts';
import { tamaguiConfig } from '@/theme/tamagui.config';
import { ActionSheetProvider, ConfirmProvider, NotificationsProvider } from '@/shared/ui';

/**
 * La splash nativa queda visible hasta que se resuelvan las fuentes (ver `RootLayout`). `preventAutoHideAsync`
 * puede rechazar si ya no hay splash que retener (ej. fast refresh): no es un error para la app.
 */
function holdSplash() {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

holdSplash();

/** Alimenta `ColorSchemeProvider` con el tema del perfil de la sesión (`null` sin sesión). */
function ProfileColorSchemeProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();

  return <ColorSchemeProvider profileTheme={user?.theme ?? null}>{children}</ColorSchemeProvider>;
}

function ThemedRoot({ children }: PropsWithChildren) {
  const { colorScheme } = useColorSchemeControl();

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
 * tanto se ve la splash. Si fallan se sigue con la del sistema en vez de quedar en blanco.
 */
export default function RootLayout() {
  const systemScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({ ...MONTSERRAT_FACES, ...BRICOLAGE_FACES });
  const fontsSettled = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontsSettled) void SplashScreen.hideAsync();
  }, [fontsSettled]);

  if (!fontsSettled) return null;

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={systemScheme === 'dark' ? 'dark' : 'light'}>
      <SWRProvider>
        <AuthProvider>
          <ProfileColorSchemeProvider>
            <ThemedRoot>
              <NotificationsProvider>
                <ConfirmProvider>
                  <ActionSheetProvider>
                    <AuthGate />
                    <ServerWakeNotice />
                  </ActionSheetProvider>
                </ConfirmProvider>
              </NotificationsProvider>
            </ThemedRoot>
          </ProfileColorSchemeProvider>
        </AuthProvider>
      </SWRProvider>
    </TamaguiProvider>
  );
}
