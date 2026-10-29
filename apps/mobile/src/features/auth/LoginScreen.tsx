// tamagui-ignore
import { loginSchema } from '@omni/shared/auth';
import { RADIUS, SPACING } from '@omni/shared/theme';
import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, type TamaguiElement } from 'tamagui';

import { useAuth } from '@/core/auth';
import { useColorSchemeControl } from '@/core/theme';
import { ensureServerAwake } from '@/shared/api';
import { Banner, Button, DisplayTitle, getErrorMessage, PasswordField, TextField, useKeyboardInset } from '@/shared/ui';
import { themedElevation } from '@/theme/elevation';

import LOGO from '../../../assets/images/splash-icon.png';

import { AuthBackground } from './components/AuthBackground';

const LOGO_SIZE = 88;
const FORM_MAX_WIDTH = 420;

type FieldErrors = Partial<Record<'username' | 'password', string>>;

/**
 * Login v2: logo y título arriba y el form en una hoja inferior de radio 32 que sube con el teclado
 * (`useKeyboardInset`); el form no pasa de 420 de ancho en pantallas grandes (web: `miw="25rem"`). Al montar sondea el health (`ensureServerAwake`) para que la API despierte mientras el usuario escribe y
 * el aviso aparezca si tarda; el POST del login espera ese sondeo si sigue en curso. Mientras el login está en
 * curso, los campos (el ojo de la contraseña incluido) quedan deshabilitados; si falla, el foco vuelve a la
 * contraseña (el campo deshabilitado lo pierde y cierra el teclado).
 */
export function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorSchemeControl();
  const keyboardInset = useKeyboardInset();
  const passwordRef = useRef<TamaguiElement>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  useEffect(() => {
    void ensureServerAwake();
  }, []);

  useEffect(() => {
    if (error && !loading) (passwordRef.current as TextInput | null)?.focus();
  }, [error, loading]);

  const onSubmit = async () => {
    if (submitting.current) return;
    const parsed = loginSchema.safeParse({ username: username.trim(), password });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === 'username' || field === 'password') && !errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      setError(null);
      return;
    }

    submitting.current = true;
    setFieldErrors({});
    setLoading(true);
    setError(null);
    try {
      await login(parsed.data.username, parsed.data.password);
    } catch (err) {
      setError(getErrorMessage(err, 'Error al iniciar sesión'));
    } finally {
      submitting.current = false;
      setLoading(false);
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
            gap={SPACING.lg}
            paddingHorizontal={SPACING.xl}
            paddingTop={insets.top + SPACING['3xl']}
            paddingBottom={SPACING.xl}
          >
            <YStack
              width={LOGO_SIZE}
              height={LOGO_SIZE}
              padding={SPACING['2xs']}
              borderRadius={RADIUS.xl}
              borderWidth={1}
              borderColor="$borderSubtle"
              backgroundColor="$backgroundStrong"
              overflow="hidden"
              {...themedElevation('card', colorScheme)}
            >
              <Image source={LOGO} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessible={false} />
            </YStack>
            <DisplayTitle textAlign="center" accent="Omni">
              ¡Te damos la bienvenida a Omni!
            </DisplayTitle>
          </YStack>

          <YStack
            backgroundColor="$backgroundStrong"
            borderTopLeftRadius={RADIUS['2xl']}
            borderTopRightRadius={RADIUS['2xl']}
            paddingHorizontal={SPACING.xl}
            paddingTop={SPACING.xl}
            paddingBottom={keyboardInset > 0 ? SPACING.xl : insets.bottom + SPACING.xl}
            {...themedElevation('sheet', colorScheme)}
          >
            <YStack width="100%" maxWidth={FORM_MAX_WIDTH} alignSelf="center" gap={SPACING.lg}>
              <DisplayTitle size="md">Ingresá a tu cuenta</DisplayTitle>

              {error ? <Banner color="destructive">{error}</Banner> : null}

              <YStack gap={SPACING.md}>
                <TextField
                  label="Usuario"
                  value={username}
                  onChangeText={value => {
                    setUsername(value);
                    setFieldErrors(prev => ({ ...prev, username: undefined }));
                  }}
                  error={fieldErrors.username}
                  disabled={loading}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => (passwordRef.current as TextInput | null)?.focus()}
                />
                <PasswordField
                  ref={passwordRef}
                  label="Contraseña"
                  value={password}
                  onChangeText={value => {
                    setPassword(value);
                    setFieldErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  error={fieldErrors.password}
                  disabled={loading}
                  autoComplete="current-password"
                  returnKeyType="go"
                  submitBehavior="submit"
                  onSubmitEditing={() => void onSubmit()}
                />
                <Button size="lg" fullWidth loading={loading} onPress={() => void onSubmit()}>
                  Ingresar
                </Button>
              </YStack>
            </YStack>
          </YStack>
        </ScrollView>
      </YStack>
    </YStack>
  );
}
