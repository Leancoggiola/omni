import { SPACING } from '@omni/shared/theme';
import { useRef, useState } from 'react';
import { type TextInput } from 'react-native';
import { YStack, type TamaguiElement } from 'tamagui';

import { Button, getErrorMessage, notifyError, notifySuccess, PasswordField, SectionCard } from '@/shared/ui';

import { validatePasswordForm, type PasswordFormErrors } from '../utils/profileForm';

import type { ChangePasswordPayload } from '@omni/shared/users';

type PasswordCardProps = {
  onSubmit: (payload: ChangePasswordPayload) => Promise<void>;
  /** Al enfocar un campo (el teclado puede estar ya abierto): la pantalla lo mantiene a la vista. */
  onFieldFocus?: () => void;
};

/** Cambiar contraseña: actual + nueva + confirmar, con validación al enviar y botón deshabilitado hasta que haya cambios. */
export function PasswordCard({ onSubmit, onFieldFocus }: PasswordCardProps) {
  const newRef = useRef<TamaguiElement>(null);
  const confirmRef = useRef<TamaguiElement>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<PasswordFormErrors>({});
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  const dirty = currentPassword !== '' || newPassword !== '' || confirmPassword !== '';

  const handleSubmit = async () => {
    if (submitting.current || !dirty) return;
    const found = validatePasswordForm(currentPassword, newPassword, confirmPassword);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    submitting.current = true;
    setLoading(true);
    try {
      await onSubmit({ currentPassword, newPassword });
      setCurrentPassword('');
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
          label="Contraseña actual"
          onFocus={onFieldFocus}
          value={currentPassword}
          onChangeText={value => {
            setCurrentPassword(value);
            setErrors(prev => ({ ...prev, currentPassword: undefined }));
          }}
          error={errors.currentPassword}
          autoComplete="current-password"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => (newRef.current as TextInput | null)?.focus()}
        />
        <PasswordField
          ref={newRef}
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
