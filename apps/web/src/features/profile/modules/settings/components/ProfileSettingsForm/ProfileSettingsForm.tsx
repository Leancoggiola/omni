import { useState } from 'react';
import {
  Alert,
  Button,
  Divider,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  useMantineColorScheme,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';

import { clearSessionColorScheme } from '@/core/theme';
import { DISPLAY_DATE_FORMAT } from '@/shared/dates';
import { getErrorMessage, notifySuccess } from '@/shared/ui';

import { ProfileSectionCard } from '../../../_shared/components/ProfileSectionCard';
import {
  buildPreferencesUpdates,
  buildProfileUpdates,
  type ProfileFormValues,
  toProfileFormValues,
} from '../../../_shared/utils';

import type { ProfileTheme, UpdatePreferencesPayload, UpdateProfilePayload, UserProfile } from '@omni/shared/users';
import type { FC } from 'react';

import { PROFILE_THEME_OPTIONS } from '@omni/shared/users';
import { CalendarBlankIcon, EnvelopeSimpleIcon, FloppyDiskIcon, PhoneIcon, UserIcon } from '@phosphor-icons/react';

const READ_ONLY_DESCRIPTION = 'No se puede editar';

const inputIconProps = { size: '1rem' as const, 'aria-hidden': true as const };

interface ProfileSettingsFormProps {
  profile: UserProfile;
  isSaving: boolean;
  onSave: (payload: {
    profile: UpdateProfilePayload;
    preferences: UpdatePreferencesPayload;
    theme: ProfileTheme;
  }) => Promise<void>;
}

export const ProfileSettingsForm: FC<ProfileSettingsFormProps> = ({ profile, isSaving, onSave }) => {
  const { setColorScheme } = useMantineColorScheme();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    mode: 'controlled',
    initialValues: toProfileFormValues(profile),
  });

  const handleSubmit = form.onSubmit(async values => {
    setError(null);
    const profileUpdates = buildProfileUpdates(profile, values);
    const preferencesUpdates = buildPreferencesUpdates(profile, values);

    if (Object.keys(profileUpdates).length === 0 && Object.keys(preferencesUpdates).length === 0) {
      return;
    }

    try {
      await onSave({ profile: profileUpdates, preferences: preferencesUpdates, theme: values.theme });
      if ('theme' in preferencesUpdates) {
        clearSessionColorScheme();
        setColorScheme(values.theme);
      }
      form.resetDirty(values);
      notifySuccess('Cambios guardados correctamente');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron guardar los cambios'));
    }
  });

  return (
    <form noValidate onSubmit={handleSubmit}>
      <Paper>
        <Stack gap="xl">
          <ProfileSectionCard nested title="Información Personal" subtitle="Actualiza tus datos personales">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                label="Nombre Completo"
                name="profile-name"
                value={profile.name}
                disabled
                description={READ_ONLY_DESCRIPTION}
                leftSection={<UserIcon {...inputIconProps} />}
              />
              <TextInput
                label="Email"
                name="profile-email"
                value={profile.email ?? ''}
                disabled
                description={READ_ONLY_DESCRIPTION}
                leftSection={<EnvelopeSimpleIcon {...inputIconProps} />}
              />
              <TextInput
                label="Teléfono"
                placeholder="+34 123 456 789"
                leftSection={<PhoneIcon {...inputIconProps} />}
                {...form.getInputProps('phone')}
              />
              <DatePickerInput
                label="Fecha de Nacimiento"
                placeholder="dd/mm/aaaa"
                valueFormat={DISPLAY_DATE_FORMAT}
                leftSection={<CalendarBlankIcon {...inputIconProps} />}
                {...form.getInputProps('birthDate')}
              />
            </SimpleGrid>
          </ProfileSectionCard>

          <ProfileSectionCard nested title="Preferencias" subtitle="Personaliza tu experiencia">
            <Stack gap="md">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap={2}>
                  <Text fw={500} size="sm">
                    Notificaciones
                  </Text>
                  <Text c="dimmed" size="sm">
                    Recibir notificaciones de la app
                  </Text>
                </Stack>
                <Switch
                  checked={form.values.notifications}
                  onChange={event => form.setFieldValue('notifications', event.currentTarget.checked)}
                  aria-label="Notificaciones"
                />
              </Group>
              <Select
                label="Tema"
                data={PROFILE_THEME_OPTIONS}
                allowDeselect={false}
                {...form.getInputProps('theme')}
              />
            </Stack>
          </ProfileSectionCard>

          {error && <Alert color="destructive">{error}</Alert>}

          <Divider />

          <Group justify="flex-end">
            <Button
              type="submit"
              loading={isSaving}
              disabled={!form.isDirty()}
              leftSection={<FloppyDiskIcon size="1rem" aria-hidden />}
            >
              Guardar Cambios
            </Button>
          </Group>
        </Stack>
      </Paper>
    </form>
  );
};
