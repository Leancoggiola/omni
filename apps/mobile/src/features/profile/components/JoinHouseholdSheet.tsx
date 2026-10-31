import { formatInviteCode, getInviteErrorMessage, householdInviteCodeSchema } from '@omni/shared/household';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { CheckIcon, InfoIcon } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';
import { Banner, Button, FormSheet, TextField, UserAvatar } from '@/shared/ui';

import type { HouseholdInvitePreview } from '@omni/shared/household';

type JoinHouseholdSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPreview: (code: string) => Promise<HouseholdInvitePreview>;
  onAccept: (code: string) => Promise<void>;
  /** Se llama con el nombre de quien invitó cuando la unión se confirmó; el aviso lo da el padre en `onClosed`. */
  onJoined: (inviterName: string) => void;
  onClosed: () => void;
};

type Reviewed = { code: string; preview: HouseholdInvitePreview };

/**
 * "Tengo un código": primero se revisa (`preview`, sin cambiar nada) y recién después se acepta. El padre lo remonta
 * con `key` en cada apertura, así arranca limpio. Los errores salen en un `Banner` adentro: la hoja tapa los toasts.
 */
export function JoinHouseholdSheet({
  open,
  onOpenChange,
  onPreview,
  onAccept,
  onJoined,
  onClosed,
}: JoinHouseholdSheetProps) {
  const [raw, setRaw] = useState('');
  const [reviewed, setReviewed] = useState<Reviewed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const colors = useSemanticColors();

  const parsed = householdInviteCodeSchema.safeParse({ code: raw });
  const normalized = parsed.success ? parsed.data.code : null;

  const run = async (action: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(getInviteErrorMessage(err));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (!normalized) return;
    return run(async () => setReviewed({ code: normalized, preview: await onPreview(normalized) }));
  };

  const handleAccept = () => {
    if (!reviewed) return;
    return run(async () => {
      await onAccept(reviewed.code);
      onJoined(reviewed.preview.inviter.name);
      onOpenChange(false);
    });
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={reviewed ? 'Revisá y unite' : 'Ingresar código'}
      busy={loading}
      onClosed={onClosed}
    >
      {reviewed ? (
        <PreviewStep preview={reviewed.preview} />
      ) : (
        <>
          <Paragraph color="$dimmed" fontSize={FONT_SIZE.md}>
            Pedile a tu pareja el código de 8 caracteres que generó en su Perfil. Primero vas a ver un resumen de lo que
            se suma, antes de confirmar nada.
          </Paragraph>
          <TextField
            label="Código de invitación"
            description="Podés pegarlo con espacios o guiones y en minúsculas: lo ordenamos por vos."
            value={raw}
            onChangeText={setRaw}
            autoCapitalize="characters"
            autoCorrect={false}
            disabled={loading}
          />
          {normalized ? (
            <XStack
              gap={SPACING.xs}
              alignItems="center"
              backgroundColor="$successSurface"
              borderWidth={1}
              borderColor="$successBorder"
              borderRadius={RADIUS.md}
              paddingVertical={SPACING.xs}
              paddingHorizontal={SPACING.md}
            >
              <CheckIcon size={18} color={colors.success} />
              <Paragraph flex={1} fontSize={FONT_SIZE.md}>{`Se lee como ${formatInviteCode(normalized)}`}</Paragraph>
            </XStack>
          ) : null}
        </>
      )}
      {error ? <Banner color="destructive">{error}</Banner> : null}
      <YStack gap={SPACING.xs}>
        {reviewed ? (
          <Button fullWidth size="lg" loading={loading} onPress={() => void handleAccept()}>
            {`Unirme al hogar de ${reviewed.preview.inviter.name}`}
          </Button>
        ) : (
          <Button fullWidth size="lg" disabled={!normalized} loading={loading} onPress={() => void handlePreview()}>
            Revisar invitación
          </Button>
        )}
        <Button fullWidth variant="outline" disabled={loading} onPress={() => onOpenChange(false)}>
          Cancelar
        </Button>
      </YStack>
    </FormSheet>
  );
}

function PreviewStep({ preview }: { preview: HouseholdInvitePreview }) {
  const { inviter, contributes, conflicts } = preview;
  const discarded = conflicts.media.length + conflicts.pantry.length;

  return (
    <YStack gap={SPACING.md}>
      <XStack gap={SPACING.sm} alignItems="center">
        <UserAvatar name={inviter.name} />
        <YStack flex={1}>
          <Paragraph fontWeight="700" fontSize={FONT_SIZE.lg}>
            {inviter.name}
          </Paragraph>
          <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm}>
            te invitó a su hogar
          </Paragraph>
        </YStack>
      </XStack>
      <Paragraph color="$dimmed" fontSize={FONT_SIZE.xs} fontWeight="700" textTransform="uppercase">
        Vos aportás
      </Paragraph>
      <XStack gap={SPACING.xs}>
        <Stat value={contributes.mediaCount} label="películas y series" />
        <Stat value={contributes.pantryProductCount} label="productos de alacena" />
        <Stat value={contributes.shoppingItemCount} label="ítems de compras" />
      </XStack>
      {discarded > 0 ? (
        <YStack gap={SPACING['2xs']}>
          <Paragraph fontWeight="700" fontSize={FONT_SIZE.md}>
            {`${discarded} ${discarded === 1 ? 'repetido se descarta' : 'repetidos se descartan'}`}
          </Paragraph>
          <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm}>
            {`Si algo está en los dos hogares, queda el registro de ${inviter.name}.`}
          </Paragraph>
          {conflicts.media.map(item => (
            <DiscardedRow
              key={`${item.mediaType}:${item.tmdbId}`}
              name={item.title}
              kind={item.mediaType === 'movie' ? 'Película' : 'Serie'}
            />
          ))}
          {conflicts.pantry.map(item => (
            <DiscardedRow key={item.name} name={item.name} kind="Alacena" />
          ))}
        </YStack>
      ) : null}
      <Banner color="info" icon={InfoIcon}>
        Gimnasio y gastos no cambian. Si después te desvinculás, te llevás una copia de todo lo compartido.
      </Banner>
    </YStack>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <YStack
      flex={1}
      alignItems="center"
      gap={SPACING['3xs']}
      padding={SPACING.sm}
      borderRadius={RADIUS.md}
      borderWidth={1}
      borderColor="$borderSubtle"
      accessible
      accessibilityLabel={`${value} ${label}`}
    >
      <Paragraph fontWeight="800" fontSize={FONT_SIZE.xl}>
        {String(value)}
      </Paragraph>
      <Paragraph color="$dimmed" fontSize={FONT_SIZE.xs} textAlign="center">
        {label}
      </Paragraph>
    </YStack>
  );
}

function DiscardedRow({ name, kind }: { name: string; kind: string }) {
  return (
    <XStack justifyContent="space-between" gap={SPACING.sm}>
      <Paragraph flex={1} fontSize={FONT_SIZE.md} numberOfLines={1}>
        {name}
      </Paragraph>
      <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm}>
        {kind}
      </Paragraph>
    </XStack>
  );
}
