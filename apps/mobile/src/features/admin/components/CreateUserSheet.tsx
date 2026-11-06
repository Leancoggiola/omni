import { SPACING } from '@omni/shared/theme';
import { useEffect, useRef, useState } from 'react';
import { type TextInput } from 'react-native';
import { YStack, type TamaguiElement } from 'tamagui';

import { Banner, Button, FormSheet, getErrorMessage, notifySuccess, PasswordField, TextField } from '@/shared/ui';

import { INITIAL_CREATE_USER_FORM_VALUES, toCreateUserPayload, validateCreateUserForm } from '../utils/createUserForm';

import type { CreateUserFormErrors, CreateUserFormValues } from '../utils/createUserForm';
import type { CreateUserPayload } from '@omni/shared/auth';

type CreateUserSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: CreateUserPayload) => Promise<unknown>;
};

/**
 * "Crear usuario" (= `CreateUserModal` de web): usuario, nombre, email opcional y contraseña inicial con su
 * confirmación. El padre lo remonta con `key` en cada apertura, así arranca limpio. La hoja tapa los toasts: el
 * error (p. ej. usuario duplicado) sale en un `Banner` adentro y el "Usuario creado" se avisa cuando la hoja ya se cerró.
 */
export function CreateUserSheet({ open, onOpenChange, onCreate }: CreateUserSheetProps) {
  const nameRef = useRef<TamaguiElement>(null);
  const emailRef = useRef<TamaguiElement>(null);
  const passwordRef = useRef<TamaguiElement>(null);
  const confirmRef = useRef<TamaguiElement>(null);
  const [values, setValues] = useState<CreateUserFormValues>(INITIAL_CREATE_USER_FORM_VALUES);
  const [errors, setErrors] = useState<CreateUserFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const pendingNotice = useRef(false);

  const dirty = Object.values(values).some(value => value !== '');

  const flushNotice = () => {
    if (!pendingNotice.current) return;
    pendingNotice.current = false;
    notifySuccess('Usuario creado');
  };

  useEffect(() => flushNotice, []);

  const setField = (field: keyof CreateUserFormValues) => (value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
    setSubmitError(null);
  };

  const focusNext = (ref: { current: TamaguiElement | null }) => () => (ref.current as TextInput | null)?.focus();

  const handleSubmit = async () => {
    if (submitting.current || !dirty) return;
    const found = validateCreateUserForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    submitting.current = true;
    setLoading(true);
    setSubmitError(null);
    try {
      await onCreate(toCreateUserPayload(values));
      pendingNotice.current = true;
      onOpenChange(false);
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No se pudo crear el usuario'));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Crear usuario" busy={loading} onClosed={flushNotice}>
      {submitError ? <Banner color="destructive">{submitError}</Banner> : null}
      <TextField
        label="Usuario"
        description="6 a 20 letras o números. Es con lo que inicia sesión."
        placeholder="usuario01"
        required
        value={values.username}
        onChangeText={setField('username')}
        error={errors.username}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        disabled={loading}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={focusNext(nameRef)}
      />
      <TextField
        ref={nameRef}
        label="Nombre"
        placeholder="Nombre y apellido"
        required
        value={values.name}
        onChangeText={setField('name')}
        error={errors.name}
        disabled={loading}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={focusNext(emailRef)}
      />
      <TextField
        ref={emailRef}
        label="Email"
        description="Opcional."
        placeholder="usuario@email.com"
        value={values.email}
        onChangeText={setField('email')}
        error={errors.email}
        inputMode="email"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        disabled={loading}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={focusNext(passwordRef)}
      />
      <PasswordField
        ref={passwordRef}
        label="Contraseña inicial"
        required
        value={values.password}
        onChangeText={setField('password')}
        error={errors.password}
        autoComplete="new-password"
        disabled={loading}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={focusNext(confirmRef)}
      />
      <PasswordField
        ref={confirmRef}
        label="Confirmar contraseña"
        required
        value={values.confirmPassword}
        onChangeText={setField('confirmPassword')}
        error={errors.confirmPassword}
        autoComplete="new-password"
        disabled={loading}
        returnKeyType="go"
        submitBehavior="submit"
        onSubmitEditing={() => void handleSubmit()}
      />
      <YStack gap={SPACING.xs}>
        <Button fullWidth size="lg" loading={loading} disabled={!dirty} onPress={() => void handleSubmit()}>
          Crear usuario
        </Button>
        <Button fullWidth variant="outline" disabled={loading} onPress={() => onOpenChange(false)}>
          Cancelar
        </Button>
      </YStack>
    </FormSheet>
  );
}
