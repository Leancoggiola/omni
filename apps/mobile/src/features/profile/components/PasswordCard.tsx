import { SPACING } from '@omni/shared/theme';
import { useRef, useState } from 'react';
import { type TextInput } from 'react-native';
import { YStack, type TamaguiElement } from 'tamagui';

import { Button, getErrorMessage, notifyError, notifySuccess, PasswordField, SectionCard } from '@/shared/ui';

import { validatePasswordForm, type PasswordFormErrors } from '../utils/profileForm';

type PasswordCardProps = {
  onSubmit: (newPassword: string) => Promise<void>;
};

/** Cambiar contraseña: nueva + confirmar, con validación al enviar y botón deshabilitado hasta que haya cambios. */
export function PasswordCard({ onSubmit }: PasswordCardProps) {
  const confirmRef = useRef<TamaguiElement>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<PasswordFormErrors>({});
  const [loading, setLoading] = useState(false);
  // `loading` es estado de React: Enter y toque en el mismo frame pasarían los dos antes del re-render.
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
          value={newPassword}
          onChangeText={value => {
            setNewPassword(value);
            setErrors(prev => ({ ...prev, newPassword: undefined }));
          }}
          error={errors.newPassword}
          autoComplete="new-password"
          returnKeyType="next"
          submitBehavior="submit"
          // Tamagui tipa el ref de Input como TamaguiElement; en nativo es el TextInput de RN.
          onSubmitEditing={() => (confirmRef.current as TextInput | null)?.focus()}
        />
        <PasswordField
          ref={confirmRef}
          label="Confirmar contraseña"
          value={confirmPassword}
          onChangeText={value => {
            setConfirmPassword(value);
            setErrors(prev => ({ ...prev, confirmPassword: undefined }));
          }}
          error={errors.confirmPassword}
          autoComplete="new-password"
          returnKeyType="go"
          // Sin cerrar el teclado: al desenfocar, Android pasa el foco al primer campo.
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
