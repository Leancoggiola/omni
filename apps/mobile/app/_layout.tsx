import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Redirect, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { TamaguiProvider, Theme, YStack } from 'tamagui';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/core/auth';
import { ColorSchemeProvider, useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { NAVIGATION_THEMES } from '@/theme/navigationTheme';
import { MONTSERRAT_FACES } from '@/theme/fonts';
import { tamaguiConfig } from '@/theme/tamagui.config';
import { ActionSheetProvider, ConfirmProvider, NotificationsProvider, Spinner } from '@/shared/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const colors = useSemanticColors();
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

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.body } }} />;
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
  const systemScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts(MONTSERRAT_FACES);
  const fontsSettled = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontsSettled) void SplashScreen.hideAsync();
  }, [fontsSettled]);

  if (!fontsSettled) return null;

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={systemScheme === 'dark' ? 'dark' : 'light'}>
      <AuthProvider>
        <ColorSchemeProvider>
          <ThemedRoot>
            <NotificationsProvider>
              <ConfirmProvider>
                <ActionSheetProvider>
                  <AuthGate />
                </ActionSheetProvider>
              </ConfirmProvider>
            </NotificationsProvider>
          </ThemedRoot>
        </ColorSchemeProvider>
      </AuthProvider>
    </TamaguiProvider>
  );
}
