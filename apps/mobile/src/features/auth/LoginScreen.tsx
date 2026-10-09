// tamagui-ignore
// Sin extracción del compilador de Tamagui: aplana el YStack estático del contenedor y el test (que mockea
// `tamagui`) lo recibe sin config. Es una pantalla de un solo render: no se pierde nada en runtime.
import { loginSchema } from '@omni/shared/auth';
import { BRAND, RADIUS, SPACING } from '@omni/shared/theme';
import { useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, ScrollView, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, type TamaguiElement } from 'tamagui';

import { useAuth } from '@/core/auth';
import { Banner, Button, PasswordField, SectionCard, TextField, Title } from '@/shared/ui';
import { elevation } from '@/theme/elevation';

import LOGO from '../../../assets/images/splash-icon.png';

import { AuthBackground } from './components/AuthBackground';

const LOGO_SIZE = 72;
/** Ancho máximo de la card en pantallas grandes (web: `miw="25rem"`). */
const CARD_MAX_WIDTH = 420;

type FieldErrors = Partial<Record<'username' | 'password', string>>;

export function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TamaguiElement>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // `loading` es estado de React: Enter y toque en el mismo frame pasarían los dos antes del re-render.
  const submitting = useRef(false);

  const onSubmit = async () => {
    if (submitting.current) return;
    // Como web: "Ingresar" siempre habilitado y validación al enviar con el schema compartido.
    const parsed = loginSchema.safeParse({ username: username.trim(), password });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === 'username' || field === 'password') && !errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      // El error del servidor de un intento anterior ya no corresponde a lo que hay en los campos.
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
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <AuthBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: SPACING.md,
            paddingTop: insets.top + SPACING.md,
            paddingBottom: insets.bottom + SPACING.md,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <YStack width="100%" maxWidth={CARD_MAX_WIDTH} alignSelf="center">
            <SectionCard>
              <YStack alignItems="center">
                <YStack
                  width={LOGO_SIZE}
                  height={LOGO_SIZE}
                  borderRadius={RADIUS.lg}
                  borderWidth={1}
                  borderColor={BRAND[9]}
                  backgroundColor="$backgroundStrong"
                  overflow="hidden"
                  {...elevation('md')}
                >
                  <Image
                    source={LOGO}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                    accessible={false}
                  />
                </YStack>
              </YStack>
              <Title order={2} textAlign="center">
                ¡Te damos la bienvenida a Omni!
              </Title>

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
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  returnKeyType="next"
                  submitBehavior="submit"
                  // Tamagui tipa el ref de Input como TamaguiElement; en nativo es el TextInput de RN.
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
                  autoComplete="current-password"
                  returnKeyType="go"
                  // Sin cerrar el teclado: al desenfocar, Android pasa el foco al primer campo (Usuario).
                  submitBehavior="submit"
                  onSubmitEditing={() => void onSubmit()}
                />
                <Button size="lg" fullWidth loading={loading} onPress={() => void onSubmit()}>
                  Ingresar
                </Button>
              </YStack>
            </SectionCard>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </YStack>
  );
}
