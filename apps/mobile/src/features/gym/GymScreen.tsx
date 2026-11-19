import { GYM_WEEKDAY_LABELS } from '@omni/shared/gym';
import { SPACING } from '@omni/shared/theme';
import { useRouter } from 'expo-router';
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  ArrowsDownUpIcon,
  CalendarBlankIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  WarningCircleIcon,
  type Icon,
} from 'phosphor-react-native';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { ScrollView } from 'react-native';
import { YStack } from 'tamagui';

import { ApiError } from '@/shared/api';
import { NAV_ICONS } from '@/shared/navigation';
import {
  actionSheet,
  Banner,
  Button,
  confirm,
  EmptyState,
  ErrorState,
  Fab,
  FAB_SIZE,
  getErrorMessage,
  IconButton,
  LoadingState,
  notifyError,
  notifySuccess,
  Screen,
  ScreenHeader,
  usePullToRefresh,
  useSheetNotice,
} from '@/shared/ui';

import { AddExerciseSheet } from './components/AddExerciseSheet';
import { ChangeDaySheet } from './components/ChangeDaySheet';
import { DaySection } from './components/DaySection';
import { EditExerciseSheet } from './components/EditExerciseSheet';
import { MoveExerciseSheet } from './components/MoveExerciseSheet';
import { PlanNameSheet } from './components/PlanNameSheet';
import { PlanPickerButton } from './components/PlanPickerButton';
import { WeekdayStrip } from './components/WeekdayStrip';
import { WeightSheet } from './components/WeightSheet';
import { useGymMutations } from './hooks/useGymMutations';
import { useGymPlan } from './hooks/useGymPlan';
import { useGymPlans } from './hooks/useGymPlans';
import { useGymWriteFailure } from './hooks/useGymWriteFailure';
import { useLastGymPlan } from './hooks/useLastGymPlan';
import { formatPlanCounts, formatSetsReps, formatWeightKg } from './utils/gymFormat';
import { deleteDayCopy, deletePlanCopy, removeExerciseCopy } from './utils/gymMessages';
import { resolvePlanId } from './utils/resolvePlanId';
import { weekdayOfDate } from './utils/gymWeekday';

import type { GymSubmitResult } from './utils/gymSubmit';
import type {
  AddGymExercisePayload,
  GymExercise,
  GymPlanDay,
  GymPlanDetail,
  GymWeekday,
  UpdateGymExercisePayload,
} from '@omni/shared/gym';

type DayOption = { value: DayAction; label: string; icon: Icon; destructive?: boolean };

type PlanAction = 'rename' | 'archive' | 'delete';
type ExerciseAction = 'edit' | 'move' | 'remove';
type DayAction = 'add' | 'reorder' | 'changeDay' | 'delete';

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

type SheetTarget =
  | { kind: 'add'; weekday: GymWeekday; key: number }
  | { kind: 'weight'; exercise: GymExercise; weekday: GymWeekday; key: number }
  | { kind: 'edit'; exercise: GymExercise; key: number }
  | { kind: 'move'; exercise: GymExercise; weekday: GymWeekday; key: number }
  | { kind: 'changeDay'; day: GymPlanDay; key: number }
  | { kind: 'name'; mode: 'create' | 'rename'; key: number };

const PLANS_PUSH_GUARD_MS = 800;

const PLAN_ACTIONS = [
  { value: 'rename', label: 'Renombrar plan', icon: PencilSimpleIcon },
  { value: 'archive', label: 'Archivar plan', icon: ArchiveIcon },
  { value: 'delete', label: 'Eliminar plan', icon: TrashIcon, destructive: true },
] as const;

const EXERCISE_ACTIONS = [
  { value: 'edit', label: 'Editar ejercicio', icon: PencilSimpleIcon },
  { value: 'move', label: 'Mover de día', icon: ArrowRightIcon },
  { value: 'remove', label: 'Quitar del día', icon: TrashIcon, destructive: true },
] as const;

function planSubtitle(plan: GymPlanDetail): string {
  const exerciseCount = plan.days.reduce((sum, day) => sum + day.exercises.length, 0);
  const counts = formatPlanCounts(plan.days.length, exerciseCount);
  return plan.status === 'ARCHIVED' ? `Archivado · ${counts}` : counts;
}

function dayActions(day: GymPlanDay): readonly DayOption[] {
  const reorder: DayOption[] =
    day.exercises.length > 1 ? [{ value: 'reorder', label: 'Ordenar ejercicios', icon: ArrowsDownUpIcon }] : [];
  return [
    { value: 'add', label: 'Agregar ejercicio a este día', icon: PlusIcon },
    ...reorder,
    { value: 'changeDay', label: 'Cambiar de día', icon: CalendarBlankIcon },
    { value: 'delete', label: 'Borrar día', icon: TrashIcon, destructive: true },
  ];
}

/**
 * Gimnasio: ruta de stack que se abre desde "Más". Muestra el último plan abierto (o el primero, si no hay uno
 * guardado), con la tira de días (llevar hasta un día, o agregar a un día vacío) y los ejercicios de cada día con su
 * peso. El peso abre su hoja con el historial, el nombre de un ejercicio abre sus opciones (editar, mover de día,
 * quitar), el "⋯" de un día las suyas (agregar a este día, ordenar, cambiar de día, borrar) y el "⋯" de la cabecera las
 * del plan (renombrar, archivar, eliminar). Un plan archivado se ve de solo lectura, con "Desarchivar plan" y "Eliminar
 * plan" al pie. El plan se cambia en "Tus planes". Las hojas se remontan con una `key` nueva en cada apertura.
 *
 * Una escritura que falla se resuelve con `useGymWriteFailure`: un 409 de formulario queda como aviso dentro de la hoja;
 * si el plan se archivó o el elemento ya no existe, la hoja se cierra y el aviso sale cuando termina de ocultarse.
 */
export function GymScreen() {
  const router = useRouter();
  const { lastPlanId, setLastPlan } = useLastGymPlan();
  const { plans, error: plansError, mutate: retryPlans } = useGymPlans();
  const planId = resolvePlanId(lastPlanId, plans);
  const { plan, error: planError, mutate: retryPlan } = useGymPlan(planId ?? null);
  const mutations = useGymMutations();
  const handleFailure = useGymWriteFailure(planId ?? '');
  const notice = useSheetNotice();
  const retry = useCallback(() => Promise.all([retryPlans(), retryPlan()]), [retryPlans, retryPlan]);
  const refreshControl = usePullToRefresh(retry);

  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const menuBusy = useRef(false);
  const plansPushedAt = useRef(0);
  const closedNotice = useRef<string | null>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const listTop = useRef(0);
  const dayTops = useRef(new Map<GymWeekday, number>());

  const readOnly = plan?.status === 'ARCHIVED';
  const openPlans = () => {
    const now = Date.now();
    if (now - plansPushedAt.current < PLANS_PUSH_GUARD_MS) return;
    plansPushedAt.current = now;
    router.push('/gym/plans');
  };
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/more'));

  const openSheet = (target: DistributiveOmit<SheetTarget, 'key'>) => {
    setSheet(current => ({ ...target, key: (current?.key ?? 0) + 1 }) as SheetTarget);
    setSheetOpen(true);
  };

  const handleClosed = () => {
    notice.flush();
    if (!closedNotice.current) return;
    notifyError(closedNotice.current);
    closedNotice.current = null;
  };

  const runSheetWrite = async (
    action: () => Promise<void>,
    fallback: string,
    success: string
  ): Promise<GymSubmitResult> => {
    try {
      await action();
      notice.queue(success);
      return { status: 'done' };
    } catch (err) {
      const failure = await handleFailure(err, fallback);
      if (failure.status === 'closed') closedNotice.current = failure.notice;
      return failure.status === 'closed' ? { status: 'closed' } : failure;
    }
  };

  const runPlainWrite = async (action: () => Promise<void>, fallback: string, success: string) => {
    try {
      await action();
      notifySuccess(success);
      return true;
    } catch (err) {
      const failure = await handleFailure(err, fallback);
      notifyError(failure.status === 'closed' ? failure.notice : failure.message);
      return false;
    }
  };

  const handleAdd = async (exercise: Omit<AddGymExercisePayload, 'planId'>): Promise<GymSubmitResult> => {
    if (!planId) return { status: 'closed' };
    return runSheetWrite(
      async () => {
        await mutations.addExercise({ ...exercise, planId });
      },
      'No se pudo agregar el ejercicio',
      'Ejercicio agregado'
    );
  };

  const handleEdit = (exerciseId: string, payload: UpdateGymExercisePayload) =>
    runSheetWrite(
      async () => {
        await mutations.updateExercise(exerciseId, payload);
      },
      'No se pudo guardar el ejercicio',
      'Ejercicio actualizado'
    );

  const handleMove = (exerciseId: string, weekday: GymWeekday) =>
    runSheetWrite(
      async () => {
        await mutations.updateExercise(exerciseId, { weekday });
      },
      'No se pudo mover el ejercicio',
      'Ejercicio movido'
    );

  const handleChangeDay = (dayId: string, weekday: GymWeekday) =>
    runSheetWrite(
      async () => {
        await mutations.changeDay(dayId, weekday);
      },
      'No se pudo cambiar el día',
      'Día cambiado'
    );

  const handleWeight = (exerciseId: string, weightKg: number | null) =>
    runSheetWrite(
      async () => {
        await mutations.updateWeight(exerciseId, weightKg);
      },
      weightKg === null ? 'No se pudo quitar el peso' : 'No se pudo guardar el peso',
      weightKg === null ? 'Peso quitado' : 'Peso guardado'
    );

  const handleNameSubmit = async (name: string, mode: 'create' | 'rename'): Promise<GymSubmitResult> => {
    if (mode === 'rename' && !plan) return { status: 'closed' };
    try {
      if (mode === 'rename' && plan) {
        await mutations.renamePlan(plan.id, name);
        notice.queue('Plan renombrado');
      } else {
        const created = await mutations.createPlan(name);
        await setLastPlan(created.id);
        notice.queue('Plan creado');
      }
      return { status: 'done' };
    } catch (err) {
      const message = getErrorMessage(
        err,
        mode === 'rename' ? 'No se pudo renombrar el plan' : 'No se pudo crear el plan'
      );
      if (mode === 'rename' && err instanceof ApiError && (err.status === 404 || err.status === 409)) {
        closedNotice.current = message;
        void retry();
        return { status: 'closed' };
      }
      return { status: 'error', message, conflict: false };
    }
  };

  const removeExercise = async (exercise: GymExercise, day: GymPlanDay) => {
    if (!plan) return;
    const { title, description } = removeExerciseCopy(plan, day, exercise);
    if (!(await confirm({ title, description, confirmLabel: 'Quitar ejercicio', destructive: true }))) return;
    await runPlainWrite(
      () => mutations.removeExercise(exercise.id),
      'No se pudo quitar el ejercicio',
      'Ejercicio quitado'
    );
  };

  const deleteDay = async (day: GymPlanDay) => {
    const { title, description } = deleteDayCopy(day);
    if (!(await confirm({ title, description, confirmLabel: 'Borrar día', destructive: true }))) return;
    await runPlainWrite(() => mutations.deleteDay(day.id), 'No se pudo borrar el día', 'Día borrado');
  };

  const archivePlan = async (target: GymPlanDetail) => {
    await runPlainWrite(
      () => mutations.archivePlan(target.id).then(() => undefined),
      'No se pudo archivar el plan',
      'Plan archivado'
    );
  };

  const unarchivePlan = async (target: GymPlanDetail) => {
    await runPlainWrite(
      () => mutations.unarchivePlan(target.id).then(() => undefined),
      'No se pudo desarchivar el plan',
      'Plan desarchivado'
    );
  };

  const deletePlan = async (target: GymPlanDetail) => {
    const { title, description } = deletePlanCopy(target);
    if (!(await confirm({ title, description, confirmLabel: 'Eliminar plan', destructive: true }))) return;
    const deleted = await runPlainWrite(
      () => mutations.deletePlan(target.id),
      'No se pudo eliminar el plan',
      'Plan eliminado'
    );
    if (!deleted) return;
    await setLastPlan(null);
    router.push('/gym/plans');
  };

  const withMenuLock = async (open: () => Promise<void>) => {
    if (menuBusy.current) return;
    menuBusy.current = true;
    try {
      await open();
    } finally {
      menuBusy.current = false;
    }
  };

  const openPlanMenu = (target: GymPlanDetail) =>
    withMenuLock(async () => {
      const action = await actionSheet<PlanAction>({ title: target.name, options: PLAN_ACTIONS });
      if (action === 'rename') openSheet({ kind: 'name', mode: 'rename' });
      else if (action === 'archive') await archivePlan(target);
      else if (action === 'delete') await deletePlan(target);
    });

  const openExerciseMenu = (exercise: GymExercise, day: GymPlanDay) =>
    withMenuLock(async () => {
      const action = await actionSheet<ExerciseAction>({
        title: exercise.name,
        description: [
          formatSetsReps(exercise.sets, exercise.reps),
          GYM_WEEKDAY_LABELS[day.weekday],
          exercise.currentWeightKg === null ? null : formatWeightKg(exercise.currentWeightKg),
        ]
          .filter(Boolean)
          .join(' · '),
        options: EXERCISE_ACTIONS,
      });
      if (action === 'edit') openSheet({ kind: 'edit', exercise });
      else if (action === 'move') openSheet({ kind: 'move', exercise, weekday: day.weekday });
      else if (action === 'remove') await removeExercise(exercise, day);
    });

  const openDayMenu = (day: GymPlanDay) =>
    withMenuLock(async () => {
      const count = day.exercises.length;
      const action = await actionSheet<DayAction>({
        title: GYM_WEEKDAY_LABELS[day.weekday],
        description: count === 1 ? '1 ejercicio' : `${count} ejercicios`,
        options: dayActions(day),
      });
      if (action === 'add') openSheet({ kind: 'add', weekday: day.weekday });
      else if (action === 'reorder' && plan)
        router.push({ pathname: '/gym/reorder', params: { planId: plan.id, dayId: day.id } });
      else if (action === 'changeDay') openSheet({ kind: 'changeDay', day });
      else if (action === 'delete') await deleteDay(day);
    });

  const goToDay = (weekday: GymWeekday) => {
    const top = dayTops.current.get(weekday);
    if (top !== undefined) scrollRef.current?.scrollTo({ y: listTop.current + top, animated: true });
  };

  const occupiedBy = (exercise: GymExercise) =>
    plan?.days.filter(day => day.exercises.some(row => row.catalogId === exercise.catalogId)).map(day => day.weekday) ??
    [];

  const renderBody = () => {
    if (plansError && !plans) {
      return <ErrorState message="No se pudieron cargar tus planes" onRetry={() => void retryPlans()} />;
    }
    if (planId === undefined) return <LoadingState variant="skeleton" rows={3} />;
    if (planId === null) {
      return (
        <EmptyState
          icon={NAV_ICONS.gym}
          title="Todavía no tenés planes"
          description="Armá un plan, cargá tus ejercicios por día de la semana y anotá el peso que levantás."
          action={
            <Button
              variant="light"
              leftSection={PlusIcon}
              fullWidth
              onPress={() => openSheet({ kind: 'name', mode: 'create' })}
            >
              Crear plan
            </Button>
          }
        />
      );
    }
    if (planError && !plan) {
      if (planError instanceof ApiError && planError.status === 404) {
        return (
          <EmptyState
            icon={WarningCircleIcon}
            title="Plan no encontrado"
            description="Puede que lo hayas borrado desde otro dispositivo."
            action={
              <Button variant="light" fullWidth onPress={() => openPlans()}>
                Ver mis planes
              </Button>
            }
          />
        );
      }
      return <ErrorState message="No se pudo cargar tu plan" onRetry={() => void retryPlan()} />;
    }
    if (!plan) return <LoadingState variant="skeleton" rows={3} />;

    return (
      <>
        {planError ? <ErrorState message="No se pudo actualizar tu plan" onRetry={() => void retryPlan()} /> : null}
        <PlanPickerButton name={plan.name} onPress={() => openPlans()} />
        {readOnly ? (
          <Banner color="accent" icon={ArchiveIcon}>
            Plan archivado: solo podés mirarlo. Para editarlo, desarchivalo.
          </Banner>
        ) : null}
        {plan.days.length === 0 ? (
          <EmptyState
            icon={NAV_ICONS.gym}
            title="Este plan está vacío"
            description="Agregá el primer ejercicio y el día se crea solo. Elegís el día de la semana al cargarlo."
          />
        ) : (
          <>
            <WeekdayStrip
              days={plan.days}
              readOnly={readOnly}
              onGoToDay={goToDay}
              onAddToDay={weekday => openSheet({ kind: 'add', weekday })}
            />
            <YStack gap={SPACING.xl} onLayout={event => (listTop.current = event.nativeEvent.layout.y)}>
              {plan.days.map(day => (
                <DaySection
                  key={day.id}
                  day={day}
                  readOnly={readOnly}
                  onLayout={event => dayTops.current.set(day.weekday, event.nativeEvent.layout.y)}
                  onWeightPress={(exercise, pressedDay) =>
                    openSheet({ kind: 'weight', exercise, weekday: pressedDay.weekday })
                  }
                  onExercisePress={
                    readOnly ? undefined : (exercise, pressedDay) => void openExerciseMenu(exercise, pressedDay)
                  }
                  onMenuPress={readOnly ? undefined : pressedDay => void openDayMenu(pressedDay)}
                />
              ))}
            </YStack>
          </>
        )}
        {readOnly ? (
          <YStack gap={SPACING.sm}>
            <Button
              fullWidth
              size="lg"
              leftSection={ArrowCounterClockwiseIcon}
              onPress={() => void withMenuLock(() => unarchivePlan(plan))}
            >
              Desarchivar plan
            </Button>
            <Button
              fullWidth
              size="lg"
              variant="outline"
              color="destructive"
              onPress={() => void withMenuLock(() => deletePlan(plan))}
            >
              Eliminar plan
            </Button>
          </YStack>
        ) : null}
      </>
    );
  };

  const showFab = Boolean(plan) && !readOnly;
  const weightSheet = sheet?.kind === 'weight' ? sheet : null;
  const weightExercise = weightSheet
    ? (plan?.days.flatMap(day => day.exercises).find(exercise => exercise.id === weightSheet.exercise.id) ??
      weightSheet.exercise)
    : null;
  const editSheet = sheet?.kind === 'edit' ? sheet : null;
  const moveSheet = sheet?.kind === 'move' ? sheet : null;
  const changeDaySheet = sheet?.kind === 'changeDay' ? sheet : null;
  const addSheet = sheet?.kind === 'add' ? sheet : null;
  const nameSheet = sheet?.kind === 'name' ? sheet : null;

  return (
    <Screen insetBottom>
      <ScrollView
        ref={scrollRef}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: SPACING.md, paddingBottom: showFab ? FAB_SIZE + SPACING.md * 2 : SPACING.xl }}
      >
        <ScreenHeader
          title="Tu gimnasio"
          accent="gimnasio"
          subtitle={plan ? planSubtitle(plan) : undefined}
          size="md"
          onBack={goBack}
          backLabel="Volver a Más"
          action={
            plan && !readOnly ? (
              <IconButton
                icon={DotsThreeIcon}
                variant="glass"
                accessibilityLabel="Opciones del plan"
                onPress={() => void openPlanMenu(plan)}
              />
            ) : undefined
          }
        />
        {renderBody()}
      </ScrollView>
      {showFab ? (
        <Fab
          icon={PlusIcon}
          label="Agregar ejercicio"
          onPress={() => openSheet({ kind: 'add', weekday: weekdayOfDate() })}
        />
      ) : null}

      {addSheet ? (
        <AddExerciseSheet
          key={`add-${addSheet.key}`}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          initialWeekday={addSheet.weekday}
          onAdd={handleAdd}
          onClosed={handleClosed}
        />
      ) : null}
      {weightSheet ? (
        <WeightSheet
          key={`weight-${weightSheet.key}`}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          exercise={weightExercise ?? weightSheet.exercise}
          weekday={weightSheet.weekday}
          readOnly={readOnly}
          onSave={weightKg => handleWeight(weightSheet.exercise.id, weightKg)}
          onClear={() => handleWeight(weightSheet.exercise.id, null)}
          onClosed={handleClosed}
        />
      ) : null}
      {editSheet ? (
        <EditExerciseSheet
          key={`edit-${editSheet.key}`}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          exercise={editSheet.exercise}
          onSubmit={payload => handleEdit(editSheet.exercise.id, payload)}
          onClosed={handleClosed}
        />
      ) : null}
      {moveSheet ? (
        <MoveExerciseSheet
          key={`move-${moveSheet.key}`}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          exerciseName={moveSheet.exercise.name}
          weekday={moveSheet.weekday}
          occupiedWeekdays={occupiedBy(moveSheet.exercise)}
          onSubmit={weekday => handleMove(moveSheet.exercise.id, weekday)}
          onClosed={handleClosed}
        />
      ) : null}
      {changeDaySheet ? (
        <ChangeDaySheet
          key={`change-${changeDaySheet.key}`}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          weekday={changeDaySheet.day.weekday}
          exerciseCount={changeDaySheet.day.exercises.length}
          occupiedWeekdays={plan?.days.filter(day => day.id !== changeDaySheet.day.id).map(day => day.weekday) ?? []}
          onSubmit={weekday => handleChangeDay(changeDaySheet.day.id, weekday)}
          onClosed={handleClosed}
        />
      ) : null}
      {nameSheet ? (
        <PlanNameSheet
          key={`name-${nameSheet.key}`}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          initialName={nameSheet.mode === 'rename' ? plan?.name : undefined}
          onSubmit={name => handleNameSubmit(name, nameSheet.mode)}
          onClosed={handleClosed}
        />
      ) : null}
    </Screen>
  );
}
