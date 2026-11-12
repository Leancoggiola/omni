import { SPACING } from '@omni/shared/theme';
import { buildProfileUpdates, normalizeOptionalText, PHONE_MAX_LENGTH } from '@omni/shared/users';
import { CalendarBlankIcon, EnvelopeSimpleIcon, FloppyDiskIcon, PhoneIcon, UserIcon } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { YStack } from 'tamagui';

import { Button, getErrorMessage, notifyError, notifySuccess, SectionCard, TextField } from '@/shared/ui';

import {
  BIRTH_DATE_INVALID_MESSAGE,
  BIRTH_DATE_PLACEHOLDER,
  birthDateToDisplay,
  maskBirthDateInput,
  parseBirthDateInput,
} from '../utils/profileForm';

import type { UpdateProfilePayload, UserProfile } from '@omni/shared/users';

const READ_ONLY_DESCRIPTION = 'No se puede editar';

type PersonalInfoCardProps = {
  profile: Pick<UserProfile, 'name' | 'email' | 'phone' | 'birthDate'>;
  onSave: (payload: UpdateProfilePayload) => Promise<unknown>;
  /** Al enfocar un campo: la pantalla lo mantiene a la vista sobre el teclado. */
  onFieldFocus?: () => void;
};

/** Información personal: nombre y email de solo lectura; teléfono y fecha de nacimiento (dd/mm/aaaa) editables. */
export function PersonalInfoCard({ profile, onSave, onFieldFocus }: PersonalInfoCardProps) {
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [serverPhone, setServerPhone] = useState(profile.phone);
  const [birthDate, setBirthDate] = useState(birthDateToDisplay(profile.birthDate));
  const [serverBirthDate, setServerBirthDate] = useState(profile.birthDate);
  const [saving, setSaving] = useState(false);

  if (profile.phone !== serverPhone) {
    setServerPhone(profile.phone);
    if (phone === (serverPhone ?? '')) setPhone(profile.phone ?? '');
  }
  if (profile.birthDate !== serverBirthDate) {
    setServerBirthDate(profile.birthDate);
    if (birthDate === birthDateToDisplay(serverBirthDate)) setBirthDate(birthDateToDisplay(profile.birthDate));
  }
  const submitting = useRef(false);

  const birthDateDay = parseBirthDateInput(birthDate);
  const birthDateError = birthDateDay === undefined ? BIRTH_DATE_INVALID_MESSAGE : undefined;
  const updates = birthDateError ? {} : buildProfileUpdates(profile, { phone, birthDate: birthDateDay });
  const dirty = Object.keys(updates).length > 0;

  const handleSave = async () => {
    if (submitting.current || !dirty) return;
    submitting.current = true;
    setSaving(true);
    try {
      await onSave(updates);
      setPhone(current => (current === phone ? (normalizeOptionalText(phone) ?? '') : current));
      notifySuccess('Cambios guardados correctamente');
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudieron guardar los cambios'));
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Información personal" subtitle="Actualizá tus datos personales">
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
          placeholder="+54 9 11 1234 5678"
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={PHONE_MAX_LENGTH}
          leftSection={PhoneIcon}
        />
        <TextField
          label="Fecha de nacimiento"
          onFocus={onFieldFocus}
          value={birthDate}
          onChangeText={text => setBirthDate(maskBirthDateInput(text))}
          placeholder={BIRTH_DATE_PLACEHOLDER}
          keyboardType="number-pad"
          maxLength={10}
          error={birthDate.length === 10 ? birthDateError : undefined}
          leftSection={CalendarBlankIcon}
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
