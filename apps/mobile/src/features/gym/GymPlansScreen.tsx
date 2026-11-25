import { SPACING } from '@omni/shared/theme';
import { useRouter } from 'expo-router';
import { PlusIcon } from 'phosphor-react-native';
import { useCallback, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { YStack } from 'tamagui';

import { NAV_ICONS } from '@/shared/navigation';
import {
  Button,
  EmptyState,
  ErrorState,
  Fab,
  FAB_SIZE,
  getErrorMessage,
  LoadingState,
  notifySuccess,
  Screen,
  ScreenHeader,
  SegmentedControl,
  usePullToRefresh,
} from '@/shared/ui';

import { PlanNameSheet } from './components/PlanNameSheet';
import { PlanRow } from './components/PlanRow';
import { useGymMutations } from './hooks/useGymMutations';
import { useGymPlansPaged } from './hooks/useGymPlansPaged';
import { useLastGymPlan } from './hooks/useLastGymPlan';

import type { GymSubmitResult } from './utils/gymSubmit';
import type { GymPlanStatus, GymPlanSummary } from '@omni/shared/gym';

const STATUS_TABS = [
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'ARCHIVED', label: 'Archivados' },
] as const;

/**
 * "Tus planes": ruta de stack que se abre desde la pill del plan en el gimnasio. Activos y archivados en dos pestañas,
 * de a 50 con "Ver más"; tocar un plan lo deja como el último abierto y vuelve al gimnasio. "Nuevo plan" lo crea, lo
 * abre y vuelve. Sin planes activos ofrece crear uno y ver los archivados.
 */
export function GymPlansScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<GymPlanStatus>('ACTIVE');
  const { plans, hasMore, isLoading, isLoadingMore, error, loadMore, mutate } = useGymPlansPaged(status);
  const { setLastPlan } = useLastGymPlan();
  const { createPlan } = useGymMutations();
  const refreshControl = usePullToRefresh(mutate);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const created = useRef(false);
  const opening = useRef(false);

  const goToGym = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/gym')), [router]);

  const openCreate = () => {
    setCreateKey(key => key + 1);
    setCreateOpen(true);
  };

  const handleCreate = async (name: string): Promise<GymSubmitResult> => {
    try {
      const plan = await createPlan(name);
      await setLastPlan(plan.id);
      created.current = true;
      return { status: 'done' };
    } catch (err) {
      return { status: 'error', message: getErrorMessage(err, 'No se pudo crear el plan'), conflict: false };
    }
  };

  const handleCreateClosed = useCallback(() => {
    if (!created.current) return;
    created.current = false;
    notifySuccess('Plan creado');
    goToGym();
  }, [goToGym]);

  const openPlan = useCallback(
    async (plan: GymPlanSummary) => {
      if (opening.current) return;
      opening.current = true;
      try {
        await setLastPlan(plan.id);
        goToGym();
      } finally {
        opening.current = false;
      }
    },
    [goToGym, setLastPlan]
  );

  const renderPlans = () => {
    if (error && !plans) return <ErrorState message="No se pudieron cargar tus planes" onRetry={() => void mutate()} />;
    if (isLoading || !plans) return <LoadingState variant="skeleton" rows={3} />;
    if (plans.length === 0 && status === 'ARCHIVED') {
      return (
        <EmptyState
          icon={NAV_ICONS.gym}
          title="No tenés planes archivados"
          description="Cuando archives un plan lo vas a ver acá, en solo lectura, y lo podés desarchivar cuando quieras."
        />
      );
    }
    if (plans.length === 0) {
      return (
        <EmptyState
          icon={NAV_ICONS.gym}
          title="No tenés planes activos"
          description="Tus planes archivados siguen en la pestaña Archivados. Creá uno nuevo para volver a entrenar."
          action={
            <YStack gap={SPACING.xs} alignSelf="stretch">
              <Button variant="light" leftSection={PlusIcon} fullWidth onPress={openCreate}>
                Crear plan
              </Button>
              <Button variant="subtle" fullWidth onPress={() => setStatus('ARCHIVED')}>
                Ver archivados
              </Button>
            </YStack>
          }
        />
      );
    }
    return (
      <YStack gap={SPACING.sm}>
        {error ? <ErrorState message="No se pudieron actualizar tus planes" onRetry={() => void mutate()} /> : null}
        {plans.map(plan => (
          <PlanRow key={plan.id} plan={plan} onPress={pressed => void openPlan(pressed)} />
        ))}
        {hasMore ? (
          <Button variant="subtle" fullWidth loading={isLoadingMore} onPress={loadMore}>
            Ver más
          </Button>
        ) : null}
      </YStack>
    );
  };

  return (
    <Screen insetBottom>
      <ScrollView
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: SPACING.md, paddingBottom: FAB_SIZE + SPACING.md * 2 }}
      >
        <ScreenHeader
          title="Tus planes"
          accent="planes"
          subtitle="Planes de entrenamiento"
          size="md"
          onBack={goToGym}
          backLabel="Volver al gimnasio"
        />
        <SegmentedControl data={STATUS_TABS} value={status} onChange={setStatus} accessibilityLabel="Planes" />
        {renderPlans()}
      </ScrollView>
      <Fab icon={PlusIcon} label="Nuevo plan" onPress={openCreate} />
      <PlanNameSheet
        key={createKey}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        onClosed={handleCreateClosed}
      />
    </Screen>
  );
}
