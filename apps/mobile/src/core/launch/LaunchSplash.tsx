import { ignoreError } from '@omni/shared/common';
import { BRAND, SEMANTIC } from '@omni/shared/theme';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, BackHandler, Easing, StyleSheet, useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import LOGO from '../../../assets/images/splash-icon.png';

import { finishLaunch, useLaunchState } from './launchState';

export const SPLASH_BACKGROUND = { light: BRAND[0], dark: SEMANTIC.dark.body } as const;
export const SPLASH_LOGO_SIZE = 200;

export const LAUNCH_SPIN_MS = 800;
export const LAUNCH_EXIT_MS = 400;
export const LAUNCH_FADE_MS = 250;

const TURN_MS = 1000;
const SPIN_LAG_DEG = (360 * LAUNCH_SPIN_MS) / TURN_MS / 2;
const EXIT_SCALE = 8;
const LAYER_Z_INDEX = 99_998;

/**
 * Capa que continúa la splash nativa. Su primer cuadro es igual a ella (`SPLASH_BACKGROUND` según el sistema y el logo
 * de `SPLASH_LOGO_SIZE` al centro, como el plugin `expo-splash-screen` de `app.json`), así que la nativa se oculta
 * recién cuando el logo cargó y se pintó (dos cuadros después).
 *
 * El giro acelera desde quieto y queda a velocidad constante hasta que la pantalla destino está lista: la rotación es
 * una vuelta lineal en bucle menos un atraso que frena en `LAUNCH_SPIN_MS`, así las dos arrancan juntas en el driver
 * nativo y no hay un salto entre la aceleración y el bucle. Con la destino lista y el giro ya a velocidad
 * (`LAUNCH_SPIN_MS` es lo mínimo que gira antes de cerrar), la espiral crece hacia su centro mientras la capa se
 * desvanece. Con "reducir movimiento" el logo queda quieto y la capa solo se
 * desvanece apenas la destino está lista.
 *
 * El botón Atrás no navega por debajo de la capa: se consume si hay historial. Sin historial (lo normal al arrancar)
 * sigue su curso y sale de la app, así una espera larga no deja a nadie atrapado.
 */
function LaunchLayer({ destinationReady }: { destinationReady: boolean }) {
  const reduceMotion = useReducedMotion();
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [scheme] = useState<keyof typeof SPLASH_BACKGROUND>(systemScheme);
  const [logoSettled, setLogoSettled] = useState(false);
  const [started, setStarted] = useState(false);
  const [spun, setSpun] = useState(false);
  const [turn] = useState(() => new Animated.Value(0));
  const [lag] = useState(() => new Animated.Value(0));
  const [exit] = useState(() => new Animated.Value(0));
  const closing = started && destinationReady && (reduceMotion || spun);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => router.canGoBack());
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!logoSettled) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        SplashScreen.hideAsync().catch(ignoreError);
        setStarted(true);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [logoSettled]);

  useEffect(() => {
    if (!started || reduceMotion) return;
    const loop = Animated.loop(
      Animated.timing(turn, { toValue: 1, duration: TURN_MS, easing: Easing.linear, useNativeDriver: true })
    );
    const speedUp = Animated.timing(lag, {
      toValue: 1,
      duration: LAUNCH_SPIN_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    loop.start();
    speedUp.start(({ finished }) => {
      if (finished) setSpun(true);
    });
    return () => {
      loop.stop();
      speedUp.stop();
    };
  }, [started, reduceMotion, turn, lag]);

  useEffect(() => {
    if (!closing) return;
    const animation = Animated.timing(exit, {
      toValue: 1,
      duration: reduceMotion ? LAUNCH_FADE_MS : LAUNCH_EXIT_MS,
      easing: reduceMotion ? Easing.linear : Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) finishLaunch();
    });
    return () => animation.stop();
  }, [closing, reduceMotion, exit]);

  const opacity = exit.interpolate(
    reduceMotion ? { inputRange: [0, 1], outputRange: [1, 0] } : { inputRange: [0, 0.25, 1], outputRange: [1, 1, 0] }
  );

  return (
    <Animated.View
      testID="launch-splash"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
      style={[StyleSheet.absoluteFill, styles.layer, { backgroundColor: SPLASH_BACKGROUND[scheme], opacity }]}
    >
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Animated.Image
        testID="launch-splash-logo"
        source={LOGO}
        fadeDuration={0}
        resizeMode="contain"
        onLoad={() => setLogoSettled(true)}
        onError={() => setLogoSettled(true)}
        style={[
          styles.logo,
          !reduceMotion && {
            transform: [
              { scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, EXIT_SCALE] }) },
              { rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
              { rotate: lag.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `-${SPIN_LAG_DEG}deg`] }) },
            ],
          },
        ]}
      />
    </Animated.View>
  );
}

/**
 * Animación de arranque en frío (#332): tapa la app desde que se va la splash nativa hasta que la pantalla destino
 * (login, Inicio o el error de sesión) está dibujada. Se monta por encima de `AuthGate` y debajo de
 * `ServerWakeNotice`, no deja tocar lo de atrás y no vuelve a aparecer una vez que terminó.
 */
export function LaunchSplash() {
  const { destinationReady, finished } = useLaunchState();

  return finished ? null : <LaunchLayer destinationReady={destinationReady} />;
}

const styles = StyleSheet.create({
  layer: { alignItems: 'center', justifyContent: 'center', zIndex: LAYER_Z_INDEX },
  logo: { width: SPLASH_LOGO_SIZE, height: SPLASH_LOGO_SIZE },
});
