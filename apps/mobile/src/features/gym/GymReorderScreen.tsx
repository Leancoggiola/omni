import { GYM_WEEKDAY_LABELS } from '@omni/shared/gym';
import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView } from 'react-native';
import { Paragraph, YStack } from 'tamagui';

import { ApiError } from '@/shared/api';
import { NAV_ICONS } from '@/shared/navigation';
import {
  Button,
  EmptyState,
  ErrorState,
  getErrorMessage,
  LoadingState,
  notifyError,
  notifySuccess,
  Screen,
  ScreenHeader,
} from '@/shared/ui';

import { GymErrorBanner } from './components/GymErrorBanner';
import { ReorderRow } from './components/ReorderRow';
import { SectionLabel } from './components/SectionLabel';
import { useGymMutations } from './hooks/useGymMutations';
import { useGymPlan } from './hooks/useGymPlan';
import { moveItem } from './utils/reorder';

import type { GymExercise } from '@omni/shared/gym';

type ReorderParams = { planId?: string; dayId?: string };

/**
 * "Ordenar el <día>": ruta de stack con el plan y el día por parámetro (`/gym/reorder?planId&dayId`). Los ejercicios se
 * mueven con las flechas y "Guardar orden" manda la lista completa del día; si la API responde 409 (otro cambio llegó
 * mientras tanto) se ofrece recargar el día. "Cancelar" y volver descartan el orden. Mientras se guarda no se puede
 * volver: ni con el header ni con el botón Atrás de Android.
 */
export function GymReorderScreen() {
  const router = useRouter();
  const { planId, dayId } = useLocalSearchParams<ReorderParams>();
  const { plan, error, mutate } = useGymPlan(planId ?? null);
  const { reorderDay } = useGymMutations();
  const [order, setOrder] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [stale, setStale] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!saving) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [saving]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/gym'));
  const day = plan?.days.find(candidate => candidate.id === dayId);
  const serverIds = day?.exercises.map(exercise => exercise.id) ?? [];
  const ids = order ?? serverIds;
  const byId = new Map(day?.exercises.map(exercise => [exercise.id, exercise]));
  const rows = ids.map(id => byId.get(id)).filter((exercise): exercise is GymExercise => exercise !== undefined);
  const changed = order !== null && order.join() !== serverIds.join();
  const outOfSync = order !== null && (order.length !== serverIds.length || order.some(id => !serverIds.includes(id)));
  const conflict = stale ?? (outOfSync ? 'El día cambió mientras lo ordenabas' : null);
  const label = day ? GYM_WEEKDAY_LABELS[day.weekday] : null;

  const move = (index: number, direction: -1 | 1) => setOrder(moveItem(ids, index, direction));

  const handleReload = async () => {
    setReloading(true);
    try {
      const fresh = await mutate().catch(() => undefined);
      if (!fresh) {
        notifyError('No se pudo recargar el día');
        return;
      }
      setOrder(null);
      setStale(null);
    } finally {
      setReloading(false);
    }
  };

  const handleSave = async () => {
    if (!day || !changed || conflict !== null || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await reorderDay(day.id, ids);
      notifySuccess('Orden guardado');
      goBack();
      return;
    } catch (err) {
      const message = getErrorMessage(err, 'No se pudo guardar el orden');
      const status = err instanceof ApiError ? err.status : 0;
      const fresh = status === 404 || status === 409 ? await mutate().catch(() => undefined) : undefined;
      if (status === 409 && fresh?.status !== 'ARCHIVED') setStale(message);
      else {
        notifyError(message);
        if (status === 404 || status === 409) {
          goBack();
          return;
        }
      }
    }
    savingRef.current = false;
    setSaving(false);
  };

  const renderBody = () => {
    if (error && !plan) return <ErrorState message="No se pudo cargar el plan" onRetry={() => void mutate()} />;
    if (!planId || !dayId) {
      return (
        <EmptyState
          icon={NAV_ICONS.gym}
          title="No encontramos el día"
          description="Volvé al gimnasio y elegí el día que querés ordenar."
        />
      );
    }
    if (!plan) return <LoadingState variant="skeleton" rows={3} />;
    if (plan.status === 'ARCHIVED') return <EmptyState icon={NAV_ICONS.gym} title="El plan está archivado" />;
    if (!day || !label) return <EmptyState icon={NAV_ICONS.gym} title="Este día ya no tiene ejercicios" />;
    return (
      <>
        {error ? <ErrorState message="No se pudo actualizar el plan" onRetry={() => void mutate()} /> : null}
        {conflict === null ? null : (
          <YStack gap={SPACING.xs}>
            <GymErrorBanner message={conflict} help="Recargá el día para ver la lista actual y volvé a ordenar." />
            <Button variant="outline" color="destructive" loading={reloading} onPress={() => void handleReload()}>
              Recargar el día
            </Button>
          </YStack>
        )}
        <SectionLabel>{label}</SectionLabel>
        <YStack gap={SPACING.sm}>
          {rows.map((exercise, index) => (
            <ReorderRow
              key={exercise.id}
              exercise={exercise}
              isFirst={index === 0}
              isLast={index === rows.length - 1}
              onMove={direction => move(index, direction)}
            />
          ))}
        </YStack>
        <Paragraph color="dimmed" fontSize={FONT_SIZE.sm}>
          El orden se guarda completo para el día: si otro ejercicio cambió mientras tanto, se pide recargar.
        </Paragraph>
      </>
    );
  };

  const editable = Boolean(day) && plan?.status === 'ACTIVE';

  return (
    <Screen insetBottom>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: SPACING.md, paddingBottom: SPACING.md }}
      >
        <ScreenHeader
          title={label ? `Ordenar el ${label.toLowerCase()}` : 'Ordenar el día'}
          accent={label ? label.toLowerCase() : 'día'}
          subtitle="Movelos con las flechas"
          size="md"
          onBack={() => {
            if (!saving) goBack();
          }}
          backLabel="Volver al gimnasio"
        />
        {renderBody()}
      </ScrollView>
      {editable ? (
        <YStack gap={SPACING.sm}>
          <Button
            fullWidth
            size="lg"
            loading={saving}
            disabled={!changed || conflict !== null}
            onPress={() => void handleSave()}
          >
            Guardar orden
          </Button>
          <Button fullWidth size="lg" variant="outline" disabled={saving} onPress={goBack}>
            Cancelar
          </Button>
        </YStack>
      ) : null}
    </Screen>
  );
}
