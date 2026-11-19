import { FC, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Group, Stack } from '@mantine/core';

import { useAuth } from '@/core/auth';
import { readLastGymPlan, saveLastGymPlan } from '@/shared/api';
import {
  confirm,
  EmptyState,
  ErrorState,
  getErrorMessage,
  LoadingState,
  notifyError,
  notifySuccess,
} from '@/shared/ui';

import { GymHeader } from './components/GymHeader';
import { GymPlanToolbar } from './components/GymPlanToolbar';
import { GymPlanView } from './components/GymPlanView';
import { PlanNameModal } from './components/PlanNameModal';
import { useGymPlanMutations } from './hooks/useGymPlanMutations';
import { useGymPlans } from './hooks/useGymPlans';
import { deletePlanCopy } from './utils/gymMessages';
import { weekdayOfDate } from './utils/gymWeekday';

import type { GymPlanStatus, GymWeekday } from '@omni/shared/gym';

import { ApiError } from '@omni/shared/api';
import { BarbellIcon, PlusIcon } from '@phosphor-icons/react';

type PlanModalMode = 'create' | 'rename';

/**
 * Gimnasio: el plan elegido vive en `?plan=` para poder enlazarlo y se recuerda en el dispositivo; sin plan en la URL
 * (o si ya no existe) se abre el último visto y, si no, el primero del estado elegido, que por defecto es el del plan
 * de la URL o "Activos". Las acciones del plan (nuevo, renombrar, archivar, eliminar) viven en la cabecera.
 */
export const GymPage: FC = () => {
  const { user } = useAuth();
  const username = user?.username;
  const [params, setParams] = useSearchParams();
  const [statusChoice, setStatusChoice] = useState<GymPlanStatus | null>(null);
  const [addWeekday, setAddWeekday] = useState<GymWeekday | null>(null);
  const [orderingDayId, setOrderingDayId] = useState<string | null>(null);
  const [planModal, setPlanModal] = useState<{ opened: boolean; target: { planId: string; name: string } | null }>({
    opened: false,
    target: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const { plans, isLoading, error, mutate: retry } = useGymPlans();
  const { createPlan, renamePlan, archivePlan, unarchivePlan, deletePlan } = useGymPlanMutations();

  const planParam = params.get('plan') ?? (username ? readLastGymPlan(username) : null);
  const fromParam = plans?.find(plan => plan.id === planParam);
  const status: GymPlanStatus = statusChoice ?? fromParam?.status ?? 'ACTIVE';
  const visiblePlans = plans?.filter(plan => plan.status === status) ?? [];
  const selected = visiblePlans.find(plan => plan.id === planParam) ?? visiblePlans[0] ?? null;
  const selectedId = selected?.id;

  useEffect(() => {
    if (selectedId && username) saveLastGymPlan(username, selectedId);
  }, [selectedId, username]);

  const selectPlan = (planId: string | null) => {
    setOrderingDayId(null);
    setParams(planId ? { plan: planId } : {}, { replace: true });
  };

  const handleStatusChange = (next: GymPlanStatus) => {
    setStatusChoice(next);
    selectPlan(plans?.find(plan => plan.status === next)?.id ?? null);
  };

  const openPlanModal = (mode: PlanModalMode) =>
    setPlanModal({
      opened: true,
      target: mode === 'rename' && selected ? { planId: selected.id, name: selected.name } : null,
    });
  const closePlanModal = () => setPlanModal(current => ({ ...current, opened: false }));

  /** Crea o renombra. Si falla avisa con un toast y deja el modal abierto; un 409 al renombrar (se archivó) lo cierra. */
  const handlePlanName = async (name: string) => {
    const target = planModal.target;
    const renaming = target !== null;
    setPlanSaving(true);
    try {
      if (target) {
        await renamePlan(target.planId, { name });
        notifySuccess('Plan renombrado');
      } else {
        const plan = await createPlan({ name });
        setStatusChoice('ACTIVE');
        selectPlan(plan.id);
        notifySuccess('Plan creado');
      }
      closePlanModal();
    } catch (err) {
      notifyError(getErrorMessage(err, renaming ? 'No se pudo renombrar el plan' : 'No se pudo crear el plan'));
      void retry();
      if (renaming && err instanceof ApiError && (err.status === 409 || err.status === 404)) closePlanModal();
    } finally {
      setPlanSaving(false);
    }
  };

  /** Archivar o desarchivar no pide confirmación (se revierte): el plan queda abierto y el filtro pasa a su nuevo estado. */
  const handleToggleArchive = async () => {
    if (!selected || archiving) return;
    const archive = selected.status === 'ACTIVE';
    const previous = selected.status;
    setArchiving(true);
    setStatusChoice(archive ? 'ARCHIVED' : 'ACTIVE');
    selectPlan(selected.id);
    try {
      await (archive ? archivePlan(selected.id) : unarchivePlan(selected.id));
      notifySuccess(archive ? 'Plan archivado' : 'Plan desarchivado');
    } catch (err) {
      setStatusChoice(previous);
      notifyError(getErrorMessage(err, archive ? 'No se pudo archivar el plan' : 'No se pudo desarchivar el plan'));
      void retry();
    } finally {
      setArchiving(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!selected || deleting) return;
    setDeleting(true);
    try {
      const { title, description } = deletePlanCopy(selected);
      if (!(await confirm({ title, description, confirmLabel: 'Eliminar plan' }))) return;
      await deletePlan(selected.id);
      selectPlan(null);
      notifySuccess('Plan eliminado');
    } catch (err) {
      notifyError(getErrorMessage(err, 'No se pudo eliminar el plan'));
      void retry();
    } finally {
      setDeleting(false);
    }
  };

  const handleShowPlans = () => {
    selectPlan(null);
    void retry();
  };

  const createPlanButton = (
    <Button variant="light" leftSection={<PlusIcon size="1rem" />} onClick={() => openPlanModal('create')}>
      Crear plan
    </Button>
  );

  const renderContent = () => {
    if (error && !plans) return <ErrorState message="No se pudieron cargar tus planes" onRetry={() => retry()} />;
    if (isLoading || !plans) return <LoadingState variant="skeleton" rows={4} />;
    if (plans.length === 0) {
      return (
        <EmptyState
          icon={<BarbellIcon />}
          title="Todavía no tenés planes"
          description="Armá un plan, cargá tus ejercicios por día de la semana y anotá el peso que levantás."
          action={createPlanButton}
        />
      );
    }

    const toolbar = (
      <GymPlanToolbar
        plans={visiblePlans}
        selected={selected}
        status={status}
        onSelect={selectPlan}
        onStatusChange={handleStatusChange}
      />
    );

    if (!selected) {
      const hasArchived = plans.some(plan => plan.status === 'ARCHIVED');
      return (
        <>
          {toolbar}
          {status === 'ARCHIVED' ? (
            <EmptyState
              icon={<BarbellIcon />}
              title="No tenés planes archivados"
              description="Cuando archives un plan lo vas a ver acá, en solo lectura, y lo podés desarchivar cuando quieras."
            />
          ) : (
            <EmptyState
              icon={<BarbellIcon />}
              title="No tenés planes activos"
              description="Tus planes archivados siguen en la pestaña Archivados. Creá uno nuevo para volver a entrenar."
              action={
                <Group gap="sm" justify="center">
                  {createPlanButton}
                  {hasArchived && (
                    <Button variant="subtle" onClick={() => handleStatusChange('ARCHIVED')}>
                      Ver archivados
                    </Button>
                  )}
                </Group>
              }
            />
          )}
        </>
      );
    }

    return (
      <GymPlanView
        key={selected.id}
        planId={selected.id}
        toolbar={toolbar}
        addWeekday={addWeekday}
        orderingDayId={orderingDayId}
        onAddWeekdayChange={setAddWeekday}
        onOrderingDayChange={setOrderingDayId}
        onShowPlans={handleShowPlans}
      />
    );
  };

  return (
    <Stack gap="lg">
      <GymHeader
        planStatus={selected?.status ?? null}
        archiving={archiving}
        disabled={orderingDayId !== null || deleting}
        onCreatePlan={() => openPlanModal('create')}
        onAddExercise={() => setAddWeekday(weekdayOfDate())}
        onRename={() => openPlanModal('rename')}
        onToggleArchive={() => void handleToggleArchive()}
        onDelete={() => void handleDeletePlan()}
      />
      {renderContent()}
      <PlanNameModal
        opened={planModal.opened}
        loading={planSaving}
        onClose={closePlanModal}
        initialName={planModal.target?.name}
        onSubmit={handlePlanName}
      />
    </Stack>
  );
};
