import { FC, useState } from 'react';
import { Alert, Button, Group, Stack, Text, TextInput } from '@mantine/core';

import { formatInviteCode, householdInviteCodeSchema } from '@omni/shared/household';
import { CheckIcon } from '@phosphor-icons/react';

interface JoinCodeStepProps {
  loading: boolean;
  error: string | null;
  onSubmit: (code: string) => void;
  onCancel: () => void;
}

/** Primer paso de "Tengo un código": el campo acepta minúsculas, espacios y guiones y muestra cómo se lee. */
export const JoinCodeStep: FC<JoinCodeStepProps> = ({ loading, error, onSubmit, onCancel }) => {
  const [raw, setRaw] = useState('');
  const parsed = householdInviteCodeSchema.safeParse({ code: raw });
  const normalized = parsed.success ? parsed.data.code : null;

  return (
    <form
      noValidate
      onSubmit={event => {
        event.preventDefault();
        if (normalized) onSubmit(normalized);
      }}
    >
      <Stack gap="md">
        <Text c="dimmed">
          Pedile a tu pareja el código de 8 caracteres que generó en su Perfil. Primero vas a ver un resumen de lo que
          se suma, antes de confirmar nada.
        </Text>
        <TextInput
          label="Código de invitación"
          description="Podés pegarlo con espacios o guiones y en minúsculas: lo ordenamos por vos."
          value={raw}
          onChange={event => setRaw(event.currentTarget.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={loading}
          data-autofocus
        />
        {normalized && (
          <Alert color="success" icon={<CheckIcon size="1rem" />}>
            Se lee como <b>{formatInviteCode(normalized)}</b>
          </Alert>
        )}
        {error && <Alert color="destructive">{error}</Alert>}
        <Group justify="flex-end" gap="sm">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!normalized} loading={loading}>
            Revisar invitación
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
