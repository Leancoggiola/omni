import { SPACING } from '@omni/shared/theme';
import { PHONE_MAX_LENGTH } from '@omni/shared/users';
import { EnvelopeSimpleIcon, FloppyDiskIcon, PhoneIcon, UserIcon } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { YStack } from 'tamagui';

import { Button, getErrorMessage, notifyError, notifySuccess, SectionCard, TextField } from '@/shared/ui';

import { buildProfileUpdates, normalizePhone } from '../utils/profileForm';

import type { UpdateProfilePayload, UserProfile } from '@omni/shared/users';

const READ_ONLY_DESCRIPTION = 'No se puede editar';

type PersonalInfoCardProps = {
  profile: Pick<UserProfile, 'name' | 'email' | 'phone'>;
  onSave: (payload: UpdateProfilePayload) => Promise<unknown>;
  /** Al enfocar el teléfono: la pantalla lo mantiene a la vista sobre el teclado. */
  onFieldFocus?: () => void;
};

/** Información personal: nombre y email de solo lectura, teléfono editable (fecha de nacimiento: #38). */
export function PersonalInfoCard({ profile, onSave, onFieldFocus }: PersonalInfoCardProps) {
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [serverPhone, setServerPhone] = useState(profile.phone);
  const [saving, setSaving] = useState(false);

  // Si el perfil trae otro teléfono (p. ej. tras `refresh()`), el campo lo sigue, salvo que el usuario ya
  // lo haya editado: lo que escribió no se pisa. Ajuste de estado durante el render, sin remontar la card.
  if (profile.phone !== serverPhone) {
    setServerPhone(profile.phone);
    if (phone === (serverPhone ?? '')) setPhone(profile.phone ?? '');
  }
  // `saving` es estado de React: dos toques en el mismo frame pasarían los dos antes del re-render.
  const submitting = useRef(false);

  const updates = buildProfileUpdates(profile, phone);
  const dirty = Object.keys(updates).length > 0;

  const handleSave = async () => {
    if (submitting.current || !dirty) return;
    submitting.current = true;
    setSaving(true);
    try {
      await onSave(updates);
      // Normaliza lo guardado (sin espacios) salvo que el usuario ya haya seguido escribiendo.
      setPhone(current => (current === phone ? (normalizePhone(phone) ?? '') : current));
      notifySuccess('Cambios guardados correctamente');
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudieron guardar los cambios'));
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Información personal" subtitle="Actualiza tus datos personales">
      <YStack gap={SPACING.md}>
        <TextField
          label="Nombre completo"
          value={profile.name}
          disabled
          description={READ_ONLY_DESCRIPTION}
          leftSection={UserIcon}
        />
        <TextField
          label="Email"
          value={profile.email ?? ''}
          disabled
          description={READ_ONLY_DESCRIPTION}
          leftSection={EnvelopeSimpleIcon}
        />
        <TextField
          label="Teléfono"
          onFocus={onFieldFocus}
          value={phone}
          onChangeText={setPhone}
          placeholder="+34 123 456 789"
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={PHONE_MAX_LENGTH}
          leftSection={PhoneIcon}
        />
        <Button
          fullWidth
          leftSection={FloppyDiskIcon}
          loading={saving}
          disabled={!dirty}
          onPress={() => void handleSave()}
        >
          Guardar cambios
        </Button>
      </YStack>
    </SectionCard>
  );
}
