import { FC } from 'react';
import { Alert, Badge, Button, Divider, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';

import { UserAvatar } from '@/shared/ui';

import type { HouseholdInvitePreview } from '@omni/shared/household';

import { InfoIcon } from '@phosphor-icons/react';

interface JoinPreviewStepProps {
  preview: HouseholdInvitePreview;
  loading: boolean;
  error: string | null;
  onAccept: () => void;
  onCancel: () => void;
}

/** Segundo paso: qué aporta quien se une y qué repetidos se descartan (gana el registro del hogar que recibe). */
export const JoinPreviewStep: FC<JoinPreviewStepProps> = ({ preview, loading, error, onAccept, onCancel }) => {
  const { inviter, contributes, conflicts } = preview;
  const discarded = conflicts.media.length + conflicts.pantry.length;

  return (
    <Stack gap="md">
      <Group gap="sm" wrap="nowrap">
        <UserAvatar name={inviter.name} />
        <Stack gap="3xs">
          <Text fw={700}>Revisá antes de unirte</Text>
          <Text c="dimmed" size="sm">
            {inviter.name} te invitó a su hogar
          </Text>
        </Stack>
      </Group>
      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
        Vos aportás
      </Text>
      <SimpleGrid cols={3} spacing="sm">
        <Stat value={contributes.mediaCount} label="películas y series" />
        <Stat value={contributes.pantryProductCount} label="productos de alacena" />
        <Stat value={contributes.shoppingItemCount} label="ítems de lista de compras" />
      </SimpleGrid>
      {discarded > 0 && (
        <Paper withBorder p="sm">
          <Stack gap="xs">
            <Group justify="space-between" wrap="nowrap">
              <Text fw={700}>
                {discarded} {discarded === 1 ? 'repetido se descarta' : 'repetidos se descartan'}
              </Text>
              <Badge variant="light" color="terracotta">
                Gana el registro de {inviter.name}
              </Badge>
            </Group>
            {conflicts.media.map(item => (
              <Group key={`${item.mediaType}:${item.tmdbId}`} justify="space-between" wrap="nowrap">
                <Text size="sm">{item.title}</Text>
                <Text size="xs" c="dimmed">
                  {item.mediaType === 'movie' ? 'Película' : 'Serie'}
                </Text>
              </Group>
            ))}
            {conflicts.pantry.map(item => (
              <Group key={item.name} justify="space-between" wrap="nowrap">
                <Text size="sm">{item.name}</Text>
                <Text size="xs" c="dimmed">
                  Alacena
                </Text>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}
      <Alert color="info" icon={<InfoIcon size="1rem" />}>
        Gimnasio y gastos no cambian. Si después te desvinculás, te llevás una copia de todo lo compartido.
      </Alert>
      {error && <Alert color="destructive">{error}</Alert>}
      <Divider />
      <Group justify="flex-end" gap="sm">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button onClick={onAccept} loading={loading}>
          Unirme al hogar de {inviter.name}
        </Button>
      </Group>
    </Stack>
  );
};

const Stat: FC<{ value: number; label: string }> = ({ value, label }) => (
  <Paper withBorder p="sm">
    <Stack gap="3xs" align="center">
      <Text fw={800} size="xl">
        {value}
      </Text>
      <Text size="xs" c="dimmed" ta="center">
        {label}
      </Text>
    </Stack>
  </Paper>
);
