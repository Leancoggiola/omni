import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { Button, Input, Paragraph, Spinner, YStack } from 'tamagui';

import { useAuth } from '@/core/auth';

export function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => username.trim().length > 0 && password.length > 0, [username, password]);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <YStack flex={1} justifyContent="center" padding="$4" gap="$4" backgroundColor="$background">
      <YStack gap="$2">
        <Paragraph size="$8" fontWeight="700" color="$color">
          Omni
        </Paragraph>
        <Paragraph theme="alt1">Iniciá sesión para continuar</Paragraph>
      </YStack>

      <Input
        placeholder="Usuario"
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
      />
      <Input
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={() => {
          if (canSubmit && !loading) void onSubmit();
        }}
      />

      {error ? (
        <Paragraph color="$destructive" onPress={() => Alert.alert('Error', error)}>
          {error}
        </Paragraph>
      ) : null}

      <Button disabled={!canSubmit || loading} onPress={() => void onSubmit()} theme="active">
        {loading ? <Spinner color="$color" /> : 'Entrar'}
      </Button>
    </YStack>
  );
}
