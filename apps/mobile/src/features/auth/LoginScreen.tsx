// tamagui-ignore
import { loginSchema } from '@omni/shared/auth';
import { RADIUS, SPACING } from '@omni/shared/theme';
import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Paragraph, XStack, YStack, type TamaguiElement } from 'tamagui';

import { useAuth } from '@/core/auth';
import { biometricIcon, useBiometrics } from '@/core/biometrics';
import { useColorSchemeControl } from '@/core/theme';
import { clearRememberedUser, ensureServerAwake, getRememberedUser, setRememberedUser } from '@/shared/api';
import {
  Banner,
  Button,
  DisplayTitle,
  getErrorMessage,
  notifyWarning,
  PasswordField,
  TextField,
  useKeyboardInset,
} from '@/shared/ui';
import { themedElevation } from '@/theme/elevation';

import LOGO from '../../../assets/images/splash-icon.png';

import { AuthBackground } from './components/AuthBackground';

const LOGO_SIZE = 88;
const AVATAR_SIZE = 80;
const COMPACT_SIZE = 48;
const INITIAL_FONT_SIZE = 28;
const COMPACT_INITIAL_FONT_SIZE = 20;
const FORM_MAX_WIDTH = 420;

type FieldErrors = Partial<Record<'username' | 'password', string>>;

type HeaderProps = { colorScheme: ReturnType<typeof useColorSchemeControl>['colorScheme']; compact: boolean };

/**
 * Cabecera de la variante "usuario recordado": avatar con la inicial, saludo y "Ingresando como …". Con `compact`
 * (teclado abierto) el avatar baja a 48 y queda en una línea con el saludo. "Ingresando como …" va en una sola línea
 * (se corta con elipsis si el usuario es largo).
 */
function RememberedHeader({ username, colorScheme, compact }: HeaderProps & { username: string }) {
  const greetingName = `${username.charAt(0).toUpperCase()}${username.slice(1)}`;
  const avatarSize = compact ? COMPACT_SIZE : AVATAR_SIZE;

  return (
    <YStack
      flexDirection={compact ? 'row' : 'column'}
      alignItems="center"
      justifyContent="center"
      gap={compact ? SPACING.sm : SPACING.md}
    >
      <YStack
        width={avatarSize}
        height={avatarSize}
        borderRadius={avatarSize / 2}
        alignItems="center"
        justifyContent="center"
        borderWidth={1}
        borderColor="$borderSubtle"
        backgroundColor="$backgroundStrong"
        accessible={false}
        {...themedElevation('card', colorScheme)}
      >
        <Paragraph
          fontFamily="$display"
          fontSize={compact ? COMPACT_INITIAL_FONT_SIZE : INITIAL_FONT_SIZE}
          fontWeight="800"
          color="$primary"
        >
          {username.charAt(0).toUpperCase()}
        </Paragraph>
      </YStack>
      <YStack alignItems={compact ? 'flex-start' : 'center'} flexShrink={1} gap={SPACING['2xs']}>
        <DisplayTitle size={compact ? 'md' : 'lg'} textAlign={compact ? 'left' : 'center'}>
          {`¡Hola, ${greetingName}!`}
        </DisplayTitle>
        <Paragraph color="$dimmed" fontSize={14} lineHeight={20} numberOfLines={1}>
          {`Ingresando como ${username}`}
        </Paragraph>
      </YStack>
    </YStack>
  );
}

/**
 * Cabecera del formulario completo: logo de marca y bienvenida. Con `compact` (teclado abierto) el logo baja a 48
 * y queda en una línea con el título en `md`, alineado a la izquierda.
 */
function DefaultHeader({ colorScheme, compact }: HeaderProps) {
  const logoSize = compact ? COMPACT_SIZE : LOGO_SIZE;

  return (
    <YStack
      flexDirection={compact ? 'row' : 'column'}
      alignItems="center"
      justifyContent="center"
      gap={compact ? SPACING.sm : SPACING.lg}
    >
      <YStack
        width={logoSize}
        height={logoSize}
        padding={compact ? SPACING['3xs'] : SPACING['2xs']}
        borderRadius={compact ? RADIUS.md : RADIUS.xl}
        borderWidth={1}
        borderColor="$borderSubtle"
        backgroundColor="$backgroundStrong"
        overflow="hidden"
        {...themedElevation('card', colorScheme)}
      >
        <Image source={LOGO} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessible={false} />
      </YStack>
      <DisplayTitle size={compact ? 'md' : 'lg'} textAlign={compact ? 'left' : 'center'} flexShrink={1} accent="Omni">
        ¡Te damos la bienvenida a Omni!
      </DisplayTitle>
    </YStack>
  );
}

/** Separador "o" entre el ingreso biométrico y el formulario con contraseña. */
function OrDivider() {
  return (
    <XStack alignItems="center" gap={SPACING.sm}>
      <YStack flex={1} height={1} backgroundColor="$borderSubtle" />
      <Paragraph color="$dimmed" fontSize={14} lineHeight={20}>
        o
      </Paragraph>
      <YStack flex={1} height={1} backgroundColor="$borderSubtle" />
    </XStack>
  );
}

/**
 * Login v2: logo y título arriba y el form en una hoja inferior de radio 32 que sube con el teclado
 * (`useKeyboardInset`); con el teclado abierto el hero se compacta (logo o avatar de 48 y título en una línea) y la
 * hoja pierde su título y ajusta el espaciado, así "Ingresar" queda visible sobre el teclado. Los campos miden 52 con
 * fuente de 16 y el botón principal, 56. El form no pasa de 420 de ancho en pantallas grandes (web: `miw="25rem"`). Al
 * montar sondea el health (`ensureServerAwake`) para que la API despierte mientras el usuario escribe y el aviso
 * aparezca si tarda; el POST del login espera ese sondeo si sigue en curso. Mientras el login está en curso, los campos
 * (el ojo de la contraseña incluido) quedan deshabilitados; si falla, el foco vuelve a la contraseña (el campo
 * deshabilitado lo pierde y cierra el teclado). Tras un login exitoso guarda solo el usuario (`setRememberedUser`); si
 * hay uno guardado, la hoja muestra la variante "usuario recordado" (avatar, saludo y un único campo de contraseña) y
 * "Ingresar con otro usuario" lo olvida, vuelve al formulario completo y deja el foco en Usuario. Si el usuario
 * guardado no pasa la validación, también se vuelve al formulario completo para mostrar el error. Cerrar sesión no lo
 * borra.
 *
 * Biometría (#173): con la biometría activada la app abre bloqueada (`useBiometrics().locked`); si además hay una
 * sesión guardada, `AuthGate` deja acá a la persona y la hoja suma "Ingresar con huella / rostro" como acción
 * principal (filled, de 56), un separador "o" y debajo el formulario con contraseña, cuyo "Ingresar" pasa a outline.
 * La biometría solo libera la sesión que ya está en SecureStore; la alternativa (cancelar, fallar o no querer usarla)
 * es la contraseña, que sí autentica contra el servidor y también libera el bloqueo. Sin sesión guardada (después de
 * cerrar sesión) no hay nada que liberar y el botón no aparece. Cancelar el prompt no avisa nada (el botón y la
 * contraseña siguen ahí); una falla (huella no reconocida, bloqueo por intentos) avisa y manda a la contraseña; si
 * funciona, `AuthGate` redirige solo al ver `locked` en false.
 *
 * "Ingresar con otro usuario" siempre desactiva la biometría de este dispositivo (la preferencia es por dispositivo y
 * la persona siguiente no debe heredarla; si quiere, la vuelve a activar desde Perfil). Con el bloqueo puesto, además,
 * cierra antes la sesión guardada: si no, salir de esta pantalla sin biometría abriría la app con la sesión de la
 * persona anterior. Un fallo al borrar los datos locales, o al desactivar la biometría, no frena el cambio de usuario
 * (la sesión ya salió de la UI): se avisa.
 */
export function LoginScreen() {
  const { login, logout, isAuthenticated } = useAuth();
  const { locked, kind, noun, unlock, markUnlocked, disable: disableBiometrics } = useBiometrics();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorSchemeControl();
  const keyboardInset = useKeyboardInset();
  const compact = keyboardInset > 0;
  const passwordRef = useRef<TamaguiElement>(null);
  const usernameRef = useRef<TamaguiElement>(null);
  const focusUsername = useRef(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remembered, setRemembered] = useState<string | null | undefined>(undefined);
  const submitting = useRef(false);
  const showBiometric = isAuthenticated && locked;

  useEffect(() => {
    void ensureServerAwake();
  }, []);

  useEffect(() => {
    let active = true;
    void getRememberedUser().then(value => {
      if (!active) return;
      setRemembered(value);
      if (value) setUsername(prev => prev || value);
    });
    return () => {
      active = false;
    };
  }, []);

  const forgetInvalidUser = () => {
    void clearRememberedUser();
    focusUsername.current = true;
    setRemembered(null);
  };

  const forgetUser = async () => {
    if (showBiometric) {
      setLoading(true);
      try {
        await logout();
      } catch {
        notifyWarning('No se pudieron borrar los datos de la sesión anterior de este celular.');
      } finally {
        setLoading(false);
      }
    }
    try {
      await disableBiometrics();
    } catch {
      notifyWarning('No se pudo desactivar el ingreso biométrico de este celular. Revisalo en tu perfil.');
    }
    forgetInvalidUser();
    setUsername('');
    setPassword('');
    setFieldErrors({});
    setError(null);
  };

  useEffect(() => {
    if (remembered === null && focusUsername.current) {
      focusUsername.current = false;
      (usernameRef.current as TextInput | null)?.focus();
    }
  }, [remembered]);

  useEffect(() => {
    if (error && !loading && !unlocking) (passwordRef.current as TextInput | null)?.focus();
  }, [error, loading, unlocking]);

  const onSubmit = async () => {
    if (submitting.current) return;
    const parsed = loginSchema.safeParse({ username, password });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === 'username' || field === 'password') && !errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      setError(null);
      if (remembered && errors.username) forgetInvalidUser();
      return;
    }

    submitting.current = true;
    setFieldErrors({});
    setLoading(true);
    setError(null);
    try {
      await login(parsed.data.username, parsed.data.password);
      await setRememberedUser(parsed.data.username);
      markUnlocked();
    } catch (err) {
      setError(getErrorMessage(err, 'Error al iniciar sesión'));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const onBiometric = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setUnlocking(true);
    setError(null);
    try {
      const result = await unlock();
      if (result === 'failed') setError(`No se pudo verificar tu ${noun}. Ingresá con tu contraseña.`);
    } finally {
      submitting.current = false;
      setUnlocking(false);
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <AuthBackground />
      <YStack flex={1} paddingBottom={keyboardInset}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <YStack
            flex={1}
            alignItems="center"
            justifyContent="center"
            paddingHorizontal={SPACING.xl}
            paddingTop={insets.top + (compact ? SPACING.md : SPACING['3xl'])}
            paddingBottom={compact ? SPACING.md : SPACING.xl}
          >
            {remembered === undefined ? null : remembered ? (
              <RememberedHeader username={remembered} colorScheme={colorScheme} compact={compact} />
            ) : (
              <DefaultHeader colorScheme={colorScheme} compact={compact} />
            )}
          </YStack>

          <YStack
            backgroundColor="$backgroundStrong"
            borderTopLeftRadius={RADIUS['2xl']}
            borderTopRightRadius={RADIUS['2xl']}
            paddingHorizontal={SPACING.xl}
            paddingTop={SPACING.xl}
            paddingBottom={compact ? SPACING.lg : insets.bottom + SPACING.xl}
            {...themedElevation('sheet', colorScheme)}
          >
            <YStack width="100%" maxWidth={FORM_MAX_WIDTH} alignSelf="center" gap={compact ? SPACING.md : SPACING.lg}>
              {remembered === undefined ? null : (
                <>
                  {remembered || compact ? null : <DisplayTitle size="md">Ingresá a tu cuenta</DisplayTitle>}

                  {error ? <Banner color="destructive">{error}</Banner> : null}

                  {showBiometric ? (
                    <>
                      <Button
                        size="xl"
                        fullWidth
                        leftSection={biometricIcon(kind)}
                        loading={unlocking}
                        disabled={loading}
                        onPress={() => void onBiometric()}
                      >
                        {`Ingresar con ${noun}`}
                      </Button>
                      <OrDivider />
                    </>
                  ) : null}

                  <YStack gap={SPACING.md}>
                    {remembered ? null : (
                      <TextField
                        ref={usernameRef}
                        label="Usuario"
                        size="lg"
                        value={username}
                        onChangeText={value => {
                          setUsername(value);
                          setFieldErrors(prev => ({ ...prev, username: undefined }));
                        }}
                        error={fieldErrors.username}
                        disabled={loading || unlocking}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="username"
                        returnKeyType="next"
                        enterKeyHint="next"
                        submitBehavior="submit"
                        onSubmitEditing={() => (passwordRef.current as TextInput | null)?.focus()}
                      />
                    )}
                    <PasswordField
                      ref={passwordRef}
                      {...(remembered
                        ? { accessibilityLabel: 'Contraseña', placeholder: 'Contraseña' }
                        : { label: 'Contraseña' })}
                      size="lg"
                      value={password}
                      onChangeText={value => {
                        setPassword(value);
                        setFieldErrors(prev => ({ ...prev, password: undefined }));
                      }}
                      error={fieldErrors.password}
                      disabled={loading || unlocking}
                      autoComplete="current-password"
                      returnKeyType="go"
                      enterKeyHint="go"
                      submitBehavior="submit"
                      onSubmitEditing={() => void onSubmit()}
                    />
                    <Button
                      size="xl"
                      fullWidth
                      variant={showBiometric ? 'outline' : 'filled'}
                      loading={loading}
                      disabled={unlocking}
                      onPress={() => void onSubmit()}
                    >
                      Ingresar
                    </Button>
                    {remembered ? (
                      <Button
                        variant="subtle"
                        size="sm"
                        alignSelf="center"
                        disabled={loading || unlocking}
                        onPress={() => void forgetUser()}
                      >
                        Ingresar con otro usuario
                      </Button>
                    ) : null}
                  </YStack>
                </>
              )}
            </YStack>
          </YStack>
        </ScrollView>
      </YStack>
    </YStack>
  );
}
