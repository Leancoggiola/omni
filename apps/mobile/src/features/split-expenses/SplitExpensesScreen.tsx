import { describeBalanceSummary, splitGatheringsByStatus } from '@omni/shared/split-expenses';
import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { useRouter } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { PlusIcon, UsersThreeIcon } from 'phosphor-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView } from 'react-native';
import { YStack } from 'tamagui';

import { SensitiveGate } from '@/core/biometrics';
import { useRevalidateOnFocus } from '@/shared/navigation';
import {
  EmptyState,
  ErrorState,
  Fab,
  FAB_SIZE,
  IconButton,
  LoadingState,
  notifySuccess,
  Paragraph,
  Screen,
  ScreenHeader,
  usePullToRefresh,
} from '@/shared/ui';

import { GatheringCard } from './components/GatheringCard';
import { NewGatheringSheet } from './components/NewGatheringSheet';
import { useGatherings } from './hooks/useGatherings';
import { useSplitBalance } from './hooks/useSplitBalance';
import { useSplitExpensesMutations } from './hooks/useSplitExpensesMutations';

import type { GatheringSummary } from '@omni/shared/split-expenses';

const DEFAULT_SUBTITLE = 'Dividí los gastos de tus juntadas fácilmente';

function SectionLabel({ children }: { children: string }) {
  return (
    <Paragraph
      color="dimmed"
      fontSize={FONT_SIZE.sm}
      fontWeight="700"
      textTransform="uppercase"
      accessibilityRole="header"
    >
      {children}
    </Paragraph>
  );
}

/**
 * Atrás de Android en Juntadas vuelve a "Más", de donde se abre el módulo: es una tab oculta y sin esto las tabs
 * mandarían a Inicio.
 */
function useBackToMore() {
  const router = useRouter();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      router.navigate('/more');
      return true;
    });
    return () => subscription.remove();
  }, [isFocused, router]);
}

function GatheringsContent() {
  const router = useRouter();
  const { gatherings, isLoading, error, mutate } = useGatherings();
  const { balance, error: balanceError, mutate: mutateBalance } = useSplitBalance();
  const { createGathering } = useSplitExpensesMutations();
  const refresh = useCallback(() => Promise.all([mutate(), mutateBalance()]), [mutate, mutateBalance]);
  const refreshControl = usePullToRefresh(refresh);
  useRevalidateOnFocus(refresh);
  useBackToMore();
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const createdId = useRef<string | null>(null);

  const openCreate = () => {
    setCreateKey(key => key + 1);
    setCreateOpen(true);
  };

  const openGathering = (id: string) => router.push({ pathname: '/split-expenses/[id]', params: { id } });

  const handleClosed = () => {
    const id = createdId.current;
    createdId.current = null;
    if (!id) return;
    notifySuccess('Juntada creada');
    openGathering(id);
  };

  const subtitle = balanceError
    ? 'No se pudo cargar tu saldo'
    : balance
      ? describeBalanceSummary(balance)
      : DEFAULT_SUBTITLE;

  const renderSection = (label: string, items: GatheringSummary[]) =>
    items.length === 0 ? null : (
      <YStack gap={SPACING.sm}>
        <SectionLabel>{label}</SectionLabel>
        {items.map(gathering => (
          <GatheringCard key={gathering.id} gathering={gathering} onPress={pressed => openGathering(pressed.id)} />
        ))}
      </YStack>
    );

  const renderGatherings = () => {
    if (error && !gatherings) {
      return <ErrorState message="No se pudieron cargar tus juntadas" onRetry={() => void refresh()} />;
    }
    if (isLoading || !gatherings) return <LoadingState variant="skeleton" rows={3} />;
    if (gatherings.length === 0) {
      return (
        <EmptyState
          icon={UsersThreeIcon}
          title="Todavía no tenés juntadas"
          description="Creá la primera y cargá los gastos a medida que pasan."
        />
      );
    }
    const { active, settled } = splitGatheringsByStatus(gatherings);
    return (
      <>
        {error ? <ErrorState message="No se pudieron actualizar tus juntadas" onRetry={() => void refresh()} /> : null}
        {renderSection('Activas', active)}
        {renderSection('Saldadas', settled)}
      </>
    );
  };

  return (
    <Screen>
      <ScrollView
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: SPACING.md, paddingBottom: FAB_SIZE + SPACING.md * 2 }}
      >
        <ScreenHeader
          title="Gastos compartidos"
          accent="compartidos"
          size="lg"
          subtitle={subtitle}
          action={
            <IconButton
              icon={UsersThreeIcon}
              variant="glass"
              accessibilityLabel="Amigos"
              onPress={() => router.push('/split-expenses/friends')}
            />
          }
        />
        {renderGatherings()}
      </ScrollView>
      <Fab icon={PlusIcon} label="Nueva juntada" onPress={openCreate} />
      <NewGatheringSheet
        key={createKey}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={createGathering}
        onCreated={id => {
          createdId.current = id;
        }}
        onClosed={handleClosed}
      />
    </Screen>
  );
}

/**
 * "Gastos compartidos" (tab oculta, con "Más" marcado): tu saldo total, las juntadas activas y saldadas con su último
 * gasto, el acceso a Amigos y "Nueva juntada". Módulo sensible: pide biometría si está activada.
 */
export function SplitExpensesScreen() {
  return (
    <SensitiveGate module="split-expenses">
      <GatheringsContent />
    </SensitiveGate>
  );
}
