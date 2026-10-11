import { SPACING } from '@omni/shared/theme';
import { useRef, useState } from 'react';
import { type TextInput } from 'react-native';
import { YStack, type TamaguiElement } from 'tamagui';

import { Button, getErrorMessage, notifyError, notifySuccess, PasswordField, SectionCard } from '@/shared/ui';

import { validatePasswordForm, type PasswordFormErrors } from '../utils/profileForm';

type PasswordCardProps = {
  onSubmit: (newPassword: string) => Promise<void>;
  /** Al enfocar un campo (el teclado puede estar ya abierto): la pantalla lo mantiene a la vista. */
  onFieldFocus?: () => void;
};

/** Cambiar contraseña: nueva + confirmar, con validación al enviar y botón deshabilitado hasta que haya cambios. */
export function PasswordCard({ onSubmit, onFieldFocus }: PasswordCardProps) {
  const confirmRef = useRef<TamaguiElement>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<PasswordFormErrors>({});
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  const dirty = newPassword !== '' || confirmPassword !== '';

  const handleSubmit = async () => {
    if (submitting.current || !dirty) return;
    const found = validatePasswordForm(newPassword, confirmPassword);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    submitting.current = true;
    setLoading(true);
    try {
      await onSubmit(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      notifySuccess('Contraseña actualizada correctamente');
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo cambiar la contraseña'));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <SectionCard title="Cambiar contraseña" subtitle="Actualiza la contraseña de tu cuenta">
      <YStack gap={SPACING.md}>
        <PasswordField
          label="Nueva contraseña"
          onFocus={onFieldFocus}
          value={newPassword}
          onChangeText={value => {
            setNewPassword(value);
            setErrors(prev => ({ ...prev, newPassword: undefined }));
          }}
          error={errors.newPassword}
          autoComplete="new-password"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => (confirmRef.current as TextInput | null)?.focus()}
        />
        <PasswordField
          ref={confirmRef}
          label="Confirmar contraseña"
          onFocus={onFieldFocus}
          value={confirmPassword}
          onChangeText={value => {
            setConfirmPassword(value);
            setErrors(prev => ({ ...prev, confirmPassword: undefined }));
          }}
          error={errors.confirmPassword}
          autoComplete="new-password"
          returnKeyType="go"
          submitBehavior="submit"
          onSubmitEditing={() => void handleSubmit()}
        />
        <Button fullWidth loading={loading} disabled={!dirty} onPress={() => void handleSubmit()}>
          Cambiar contraseña
        </Button>
      </YStack>
    </SectionCard>
  );
}
