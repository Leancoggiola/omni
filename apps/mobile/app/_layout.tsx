import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Redirect, Slot, useSegments } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { Spinner, TamaguiProvider, Theme, YStack } from 'tamagui';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/core/auth';
import { ColorSchemeProvider, useColorSchemeControl } from '@/core/theme';
import { NAVIGATION_THEMES } from '@/theme/navigationTheme';
import { INTER_FACES } from '@/theme/fonts';
import { tamaguiConfig } from '@/theme/tamagui.config';

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const onLogin = segments[0] === 'login';

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  if (!isAuthenticated && !onLogin) {
    return <Redirect href="/login" />;
  }

  if (isAuthenticated && onLogin) {
    return <Redirect href="/(tabs)" />;
  }

  return <Slot />;
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
  const [fontsLoaded] = useFonts(INTER_FACES);

  // Sin las fuentes, el primer render saldría con la tipografía del sistema y saltaría al cargarlas.
  if (!fontsLoaded) return null;

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={systemScheme === 'dark' ? 'dark' : 'light'}>
      <AuthProvider>
        <ColorSchemeProvider>
          <ThemedRoot>
            <AuthGate />
          </ThemedRoot>
        </ColorSchemeProvider>
      </AuthProvider>
    </TamaguiProvider>
  );
}
