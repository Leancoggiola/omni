import { SPACING } from '@omni/shared/theme';
import { useRef, useState } from 'react';
import { YStack } from 'tamagui';

import {
  Button,
  FormFields,
  getErrorMessage,
  notifyError,
  notifySuccess,
  PasswordField,
  SectionCard,
} from '@/shared/ui';

import { validatePasswordForm, type PasswordFormErrors } from '../utils/profileForm';

import type { ChangePasswordPayload } from '@omni/shared/users';

type PasswordCardProps = {
  onSubmit: (payload: ChangePasswordPayload) => Promise<void>;
};

/** Cambiar contraseña: actual + nueva + confirmar, con validación al enviar y botón deshabilitado hasta que haya cambios. */
export function PasswordCard({ onSubmit }: PasswordCardProps) {
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
    <SectionCard title="Cambiar contraseña" subtitle="Actualizá la contraseña de tu cuenta">
      <FormFields>
        <YStack gap={SPACING.md}>
          <PasswordField
            label="Contraseña actual"
            value={currentPassword}
            onChangeText={value => {
              setCurrentPassword(value);
              setErrors(prev => ({ ...prev, currentPassword: undefined }));
            }}
            error={errors.currentPassword}
            autoComplete="current-password"
          />
          <PasswordField
            label="Nueva contraseña"
            value={newPassword}
            onChangeText={value => {
              setNewPassword(value);
              setErrors(prev => ({ ...prev, newPassword: undefined }));
            }}
            error={errors.newPassword}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirmar contraseña"
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
      </FormFields>
    </SectionCard>
  );
}
