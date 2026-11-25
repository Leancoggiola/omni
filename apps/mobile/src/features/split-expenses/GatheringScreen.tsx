import { groupExpensesByDay, participantTones } from '@omni/shared/split-expenses';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DotsThreeIcon, ReceiptIcon, TrashIcon, WarningCircleIcon } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { ScrollView, Share, type ScrollViewInstance } from 'react-native';
import { XStack, YStack } from 'tamagui';

import { SensitiveGate } from '@/core/biometrics';
import {
  actionSheet,
  Badge,
  Banner,
  Button,
  confirm,
  EmptyState,
  ErrorState,
  getErrorMessage,
  IconButton,
  LoadingState,
  notifyError,
  notifySuccess,
  Paragraph,
  Screen,
  ScreenHeader,
  usePullToRefresh,
  useSheetNotice,
} from '@/shared/ui';

import { BottomPanel } from './components/BottomPanel';
import { ExpenseBubble } from './components/ExpenseBubble';
import { ExpenseComposer } from './components/ExpenseComposer';
import { ExpenseSheet, type ExpenseDraft } from './components/ExpenseSheet';
import { AvatarStack } from './components/ParticipantAvatar';
import { SettledPanel } from './components/SettledPanel';
import { SettleSheet } from './components/SettleSheet';
import { useGathering } from './hooks/useGathering';
import { useSplitExpensesMutations } from './hooks/useSplitExpensesMutations';
import { buildShareMessage, describeTransfers, expenseSummary, gatheringTotals } from './utils/presentation';
import { parseQuickExpense, QUICK_EXPENSE_HINT, splitQuickInput } from './utils/quickExpense';

import type { GatheringDetail, GatheringExpense } from '@omni/shared/split-expenses';

const SOLO_WARNING = 'Falta gente para dividir: esta juntada tiene una sola persona, no hay entre quién repartir.';

function DayLabel({ children }: { children: string }) {
  return (
    <XStack
      alignSelf="center"
      paddingVertical={SPACING['2xs']}
      paddingHorizontal={SPACING.sm}
      borderRadius={RADIUS.full}
      backgroundColor="surfaceGlass"
    >
      <Paragraph
        color="dimmed"
        fontSize={FONT_SIZE.sm}
        fontWeight="700"
        textTransform="uppercase"
        accessibilityRole="header"
      >
        {children}
      </Paragraph>
    </XStack>
  );
}

/** "Martín, Sofía y Juan Pablo". */
function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

type GatheringViewProps = {
  gathering: GatheringDetail;
  refresh: () => Promise<unknown>;
  stale: boolean;
  onBack: () => void;
};

/** El feed de una juntada ya cargada, con su pie (carga rápida y saldar, o "Todo saldado") y sus hojas. */
function GatheringView({ gathering, refresh, stale, onBack }: GatheringViewProps) {
  const { addExpense, deleteExpense, setGatheringSettled, deleteGathering } = useSplitExpensesMutations();
  const refreshControl = usePullToRefresh(refresh);
  const notice = useSheetNotice();
  const scroll = useRef<ScrollViewInstance>(null);
  const selfId = (gathering.participants.find(participant => participant.isSelf) ?? gathering.participants[0])?.id;
  const [pickedPayerId, setPayerId] = useState(selfId ?? '');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseKey, setExpenseKey] = useState(0);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleKey, setSettleKey] = useState(0);
  const busy = useRef(false);

  const tones = participantTones(gathering.participants);
  const days = groupExpensesByDay(gathering.expenses);
  const hasExpenses = gathering.expenses.length > 0;
  const canSplit = gathering.participants.length >= 2;
  const others = gathering.participants.filter(participant => !participant.isSelf);
  const payerId = gathering.participants.some(participant => participant.id === pickedPayerId)
    ? pickedPayerId
    : (selfId ?? '');

  const handleQuickSubmit = async () => {
    if (text.trim() === '' || busy.current) return;
    const expense = parseQuickExpense(text);
    if (!expense) {
      notifyError(QUICK_EXPENSE_HINT);
      return;
    }
    busy.current = true;
    setSending(true);
    try {
      await addExpense(gathering.id, { participantId: payerId, ...expense });
      setText(current => (current === text ? '' : current));
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo agregar el gasto'));
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  const openExpenseSheet = () => {
    if (busy.current) return;
    setExpenseDraft({ payerId, ...splitQuickInput(text) });
    setExpenseKey(key => key + 1);
    setExpenseOpen(true);
  };

  const openSettleSheet = () => {
    setSettleKey(key => key + 1);
    setSettleOpen(true);
  };

  const handleExpenseMenu = async (expense: GatheringExpense) => {
    const summary = expenseSummary(expense);
    const picked = await actionSheet({
      title: summary,
      options: [{ value: 'delete', label: 'Eliminar gasto', icon: TrashIcon, destructive: true }],
    });
    if (picked !== 'delete') return;
    const confirmed = await confirm({
      title: 'Eliminar gasto',
      description: `"${summary}" se borra de la juntada y las cuentas se recalculan. No se puede deshacer.`,
      confirmLabel: 'Eliminar',
    });
    if (!confirmed) return;
    try {
      await deleteExpense(gathering.id, expense.id);
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo eliminar el gasto'));
    }
  };

  const handleMenu = async () => {
    const picked = await actionSheet({
      title: gathering.name,
      options: [{ value: 'delete', label: 'Eliminar juntada', icon: TrashIcon, destructive: true }],
    });
    if (picked !== 'delete' || busy.current) return;
    const confirmed = await confirm({
      title: 'Eliminar juntada',
      description: `¿Seguro que querés eliminar "${gathering.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
    });
    if (!confirmed) return;
    busy.current = true;
    try {
      await deleteGathering(gathering.id);
      notifySuccess('Juntada eliminada');
      onBack();
    } catch (err) {
      busy.current = false;
      notifyError(getErrorMessage(err, 'No se pudo eliminar la juntada'));
    }
  };

  const handleReopen = async () => {
    if (busy.current) return;
    busy.current = true;
    setReopening(true);
    try {
      await setGatheringSettled(gathering.id, false);
      notifySuccess('Juntada reabierta');
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo actualizar la juntada'));
    } finally {
      busy.current = false;
      setReopening(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: buildShareMessage(gathering) });
    } catch {
      notifyError('No se pudo compartir el resumen');
    }
  };

  const renderEmpty = () => {
    if (gathering.isSettled || !canSplit) return <EmptyState icon={ReceiptIcon} title="Esta juntada no tiene gastos" />;
    return (
      <YStack gap={SPACING.md}>
        <Paragraph color="dimmed" fontSize={FONT_SIZE.md} textAlign="center" paddingHorizontal={SPACING.xl}>
          {`Creaste la juntada con ${listNames(others.map(participant => participant.displayName))}`}
        </Paragraph>
        <EmptyState
          icon={ReceiptIcon}
          title="Todavía no hay gastos"
          description="Cargá el primero acá abajo. Cada gasto aparece en este feed y las cuentas se calculan solas."
        />
      </YStack>
    );
  };

  const renderSettleRow = () => (
    <XStack alignItems="center" justifyContent="space-between" gap={SPACING.sm}>
      <YStack flex={1}>
        <Paragraph fontSize={FONT_SIZE.lg} fontWeight="700">
          Saldar cuentas
        </Paragraph>
        <Paragraph color="dimmed" fontSize={FONT_SIZE.sm}>
          {describeTransfers(gathering.settlements)}
        </Paragraph>
      </YStack>
      <Button variant="outline" size="sm" alignSelf="center" onPress={openSettleSheet}>
        Saldar
      </Button>
    </XStack>
  );

  return (
    <>
      <ScreenHeader
        title={gathering.name}
        accent=""
        titleLines={2}
        subtitle={gatheringTotals(gathering)}
        onBack={onBack}
        backLabel="Volver a las juntadas"
        action={
          <XStack alignItems="center" gap={SPACING.xs}>
            {gathering.isSettled ? (
              <Badge color="success" size="md" alignSelf="center">
                Saldada
              </Badge>
            ) : null}
            {!gathering.isSettled && !hasExpenses && canSplit ? (
              <AvatarStack
                people={gathering.participants.slice(0, 4).map(participant => ({
                  id: participant.id,
                  name: participant.displayName,
                  tone: tones[participant.id],
                }))}
              />
            ) : null}
            <IconButton
              icon={DotsThreeIcon}
              variant="glass"
              accessibilityLabel="Opciones de la juntada"
              onPress={() => void handleMenu()}
            />
          </XStack>
        }
      />

      {!canSplit ? (
        <Banner color="warning" icon={WarningCircleIcon}>
          {SOLO_WARNING}
        </Banner>
      ) : null}
      {stale ? <ErrorState message="No se pudo actualizar la juntada" onRetry={() => void refresh()} /> : null}

      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: SPACING.sm, paddingBottom: SPACING.xs }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
      >
        {hasExpenses
          ? days.map(day => (
              <YStack key={day.key} gap={SPACING.sm}>
                <DayLabel>{day.label}</DayLabel>
                {day.expenses.map(expense => (
                  <ExpenseBubble
                    key={expense.id}
                    expense={expense}
                    participants={gathering.participants}
                    tones={tones}
                    compact={gathering.isSettled}
                    onPress={gathering.isSettled ? undefined : pressed => void handleExpenseMenu(pressed)}
                  />
                ))}
              </YStack>
            ))
          : renderEmpty()}
      </ScrollView>

      {gathering.isSettled ? (
        <SettledPanel reopening={reopening} onReopen={() => void handleReopen()} onShare={() => void handleShare()} />
      ) : hasExpenses || canSplit ? (
        <BottomPanel>
          {hasExpenses ? renderSettleRow() : null}
          {canSplit ? (
            <ExpenseComposer
              participants={gathering.participants}
              tones={tones}
              payerId={payerId}
              text={text}
              disabled={sending}
              onPayerChange={setPayerId}
              onChangeText={setText}
              onSubmit={() => void handleQuickSubmit()}
              onExpand={openExpenseSheet}
            />
          ) : null}
        </BottomPanel>
      ) : null}

      {expenseDraft ? (
        <ExpenseSheet
          key={expenseKey}
          open={expenseOpen}
          onOpenChange={setExpenseOpen}
          gatheringName={gathering.name}
          participants={gathering.participants}
          tones={tones}
          initial={expenseDraft}
          onSubmit={payload => addExpense(gathering.id, payload)}
          onAdded={() => setText('')}
        />
      ) : null}
      <SettleSheet
        key={`settle-${settleKey}`}
        open={settleOpen}
        onOpenChange={setSettleOpen}
        gathering={gathering}
        tones={tones}
        onSettle={() => setGatheringSettled(gathering.id, true)}
        onSettled={() => notice.queue('Juntada saldada')}
        onClosed={notice.flush}
      />
    </>
  );
}

function GatheringContent({ onBack }: { onBack: () => void }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { gathering, error, mutate } = useGathering(id);

  if (gathering) {
    return (
      <Screen insetBottom>
        <GatheringView
          key={gathering.id}
          gathering={gathering}
          refresh={mutate}
          stale={Boolean(error)}
          onBack={onBack}
        />
      </Screen>
    );
  }

  return (
    <Screen insetBottom>
      <ScreenHeader title="Juntada" onBack={onBack} backLabel="Volver a las juntadas" />
      {error ? (
        <ErrorState message={getErrorMessage(error, 'No se pudo cargar la juntada')} onRetry={() => void mutate()} />
      ) : (
        <LoadingState variant="skeleton" rows={3} compact />
      )}
    </Screen>
  );
}

/**
 * Una juntada (ruta de stack `/split-expenses/[id]`): sus gastos como un chat agrupado por día, la carga rápida y
 * "Saldar cuentas"; saldada es de solo lectura, con "Reabrir" y "Compartir". Desde ⋯ se elimina. Módulo sensible: pide
 * biometría si está activada.
 */
export function GatheringScreen() {
  const router = useRouter();
  const onBack = () => (router.canGoBack() ? router.back() : router.replace('/split-expenses'));

  return (
    <SensitiveGate module="split-expenses" onBack={onBack}>
      <GatheringContent onBack={onBack} />
    </SensitiveGate>
  );
}
