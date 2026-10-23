import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { PROFILE_THEME_OPTIONS } from '@omni/shared/users';
import { useRef, useState } from 'react';
import { Paragraph, YStack } from 'tamagui';

import { getErrorMessage, notifyError, SectionCard, SegmentedControl, Switch } from '@/shared/ui';

import type { ProfileTheme, UpdatePreferencesPayload } from '@omni/shared/users';

type Preferences = { notifications: boolean; theme: ProfileTheme };

type PreferencesCardProps = {
  values: Preferences;
  /** Guarda en el servidor. Rechaza si falla: la card vuelve al valor anterior y avisa. */
  onChange: (payload: UpdatePreferencesPayload) => Promise<unknown>;
};

/**
 * Preferencias: guardan al instante (no hay botón). El valor nuevo se ve de inmediato; si el PATCH
 * falla vuelve al anterior con un `notifyError`.
 */
export function PreferencesCard({ values, onChange }: PreferencesCardProps) {
  const [pending, setPending] = useState<Partial<Preferences>>({});
  const inFlight = useRef(new Set<keyof Preferences>());

  const shown = { ...values, ...pending };

  const save = async <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    setPending(current => ({ ...current, [key]: value }));
    try {
      await onChange({ [key]: value });
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo guardar la preferencia'));
    } finally {
      inFlight.current.delete(key);
      setPending(current => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  };

  return (
    <SectionCard title="Preferencias" subtitle="Personaliza tu experiencia">
      <YStack gap={SPACING.lg}>
        <Switch
          label="Notificaciones"
          description="Recibir notificaciones de la app"
          checked={shown.notifications}
          onCheckedChange={checked => void save('notifications', checked)}
        />
        <YStack gap={SPACING.xs}>
          <Paragraph fontSize={FONT_SIZE.md} fontWeight="600">
            Tema
          </Paragraph>
          <SegmentedControl
            accessibilityLabel="Tema"
            data={PROFILE_THEME_OPTIONS}
            value={shown.theme}
            onChange={theme => void save('theme', theme)}
          />
        </YStack>
      </YStack>
    </SectionCard>
  );
}
