import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Redirect, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { Spinner, TamaguiProvider, Theme, YStack } from 'tamagui';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/core/auth';
import { ColorSchemeProvider, useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { NAVIGATION_THEMES } from '@/theme/navigationTheme';
import { MONTSERRAT_FACES } from '@/theme/fonts';
import { tamaguiConfig } from '@/theme/tamagui.config';
import { ConfirmProvider, NotificationsProvider } from '@/shared/ui';

// La splash nativa queda visible hasta que se resuelvan las fuentes (ver RootLayout). Puede
// rechazar si ya no hay splash que retener (ej. fast refresh): no es un error para la app.
SplashScreen.preventAutoHideAsync().catch(() => {
  // noop
});

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const colors = useSemanticColors();
  const segments = useSegments();
  const onLogin = segments[0] === 'login';

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  if (!isAuthenticated && !onLogin) {
    return <Redirect href="/login" />;
  }

  if (isAuthenticated && onLogin) {
    return <Redirect href="/(tabs)" />;
  }

  // Tabs y login sin header; Perfil es una ruta de stack sobre las tabs y su header solo trae el
  // botón de volver: el título lo pone el `ScreenHeader` de la pantalla.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.body } }}>
      <Stack.Screen
        name="profile"
        options={{
          headerShown: true,
          title: '',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.body },
          headerTintColor: colors.text,
        }}
      />
    </Stack>
  );
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

export default function RootLayout() {
  // Solo para el primer render: el tema efectivo lo fija ThemedRoot.
  const systemScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts(MONTSERRAT_FACES);
  const fontsSettled = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontsSettled) void SplashScreen.hideAsync();
  }, [fontsSettled]);

  // Sin las fuentes, el primer render saldría con la tipografía del sistema y saltaría al cargarlas;
  // mientras tanto se ve la splash. Si fallan se sigue con la del sistema en vez de quedar en blanco.
  if (!fontsSettled) return null;

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={systemScheme === 'dark' ? 'dark' : 'light'}>
      <AuthProvider>
        <ColorSchemeProvider>
          <ThemedRoot>
            <NotificationsProvider>
              <ConfirmProvider>
                <AuthGate />
              </ConfirmProvider>
            </NotificationsProvider>
          </ThemedRoot>
        </ColorSchemeProvider>
      </AuthProvider>
    </TamaguiProvider>
  );
}
