import { MemoryRouter, useLocation } from 'react-router-dom';
import { Box } from '@mantine/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';
import { ApiError } from '@/shared/api';

import { GymPage } from '../gym.page';
import { day, planDetail, planSummary } from './fixtures';

import type { GymPlanDetail, GymPlanSummary } from '@omni/shared/gym';
import type { ReactNode } from 'react';

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  plans: {
    plans: undefined as GymPlanSummary[] | undefined,
    isLoading: false,
    error: undefined as unknown,
    mutate: vi.fn(),
  },
  openPlan: { plan: undefined as GymPlanDetail | undefined },
  mutations: {
    createPlan: vi.fn(),
    renamePlan: vi.fn(),
    archivePlan: vi.fn(),
    unarchivePlan: vi.fn(),
    deletePlan: vi.fn(),
  },
  confirm: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock('@/core/auth', () => ({ useAuth: () => ({ user: { username: 'ana' } }) }));
vi.mock('../hooks/useGymPlan', () => ({ useGymPlan: () => mocks.openPlan }));
vi.mock('../hooks/useGymPlans', () => ({ useGymPlans: () => mocks.plans }));
vi.mock('../hooks/useGymPlanMutations', () => ({ useGymPlanMutations: () => mocks.mutations }));
vi.mock('../components/GymPlanView', () => ({
  GymPlanView: ({
    planId,
    addWeekday,
    toolbar,
    onOrderingDayChange,
  }: {
    planId: string;
    addWeekday: string | null;
    toolbar: ReactNode;
    onOrderingDayChange: (dayId: string | null) => void;
  }) => (
    <>
      {toolbar}
      <Box component="output" aria-label="Plan mostrado">{`${planId}${addWeekday ? ` + alta ${addWeekday}` : ''}`}</Box>
      <button type="button" onClick={() => onOrderingDayChange('d1')}>
        Simular orden
      </button>
    </>
  ),
}));
vi.mock('@/shared/ui', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/ui')>()),
  confirm: mocks.confirm,
  notifySuccess: mocks.notifySuccess,
  notifyError: mocks.notifyError,
}));

function CurrentSearch() {
  return (
    <Box component="output" aria-label="Búsqueda">
      {useLocation().search}
    </Box>
  );
}

function renderPage(path = '/gym') {
  renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <GymPage />
      <CurrentSearch />
    </MemoryRouter>
  );
}

/**
 * Abre el menú del plan y devuelve el ítem. El dropdown de Mantine queda con `display: none` en happy-dom (sin
 * layout, `hideDetached` lo toma como fuera de pantalla), por eso la consulta incluye lo oculto.
 */
async function planMenuItem(name: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Acciones del plan' }));
  return screen.findByRole('menuitem', { name, hidden: true });
}

const shown = () => screen.getByRole('status', { name: 'Plan mostrado' });
const search = () => screen.getByRole('status', { name: 'Búsqueda' });

const PLANS = [
  planSummary({ id: 'a1', name: 'Fuerza 3 días', dayCount: 3, exerciseCount: 8 }),
  planSummary({ id: 'a2', name: 'Hipertrofia', dayCount: 0, exerciseCount: 0 }),
  planSummary({ id: 'z1', name: 'Verano 2025', status: 'ARCHIVED', archivedAt: '2026-01-01T00:00:00.000Z' }),
];

describe('GymPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.plans = { plans: PLANS, isLoading: false, error: undefined, mutate: vi.fn() };
    mocks.openPlan = { plan: planDetail({ days: [day({ id: 'd1' })] }) };
    Object.values(mocks.mutations).forEach(fn => fn.mockResolvedValue(planDetail()));
  });

  it('si falla la carga de planes muestra el error con reintento', async () => {
    mocks.plans = { ...mocks.plans, plans: undefined, error: new Error('x') };
    renderPage();

    expect(screen.getByText('No se pudieron cargar tus planes')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mocks.plans.mutate).toHaveBeenCalled();
  });

  it('sin planes ofrece crear el primero, con "Nuevo plan" como única acción de la cabecera', async () => {
    mocks.plans = { ...mocks.plans, plans: [] };
    mocks.mutations.createPlan.mockResolvedValue(planDetail({ id: 'nuevo', days: [] }));
    renderPage();

    expect(screen.getByText('Todavía no tenés planes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar ejercicio' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acciones del plan' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Crear plan' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo plan' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Nombre/ }), '  Fuerza  ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear plan' }));

    await waitFor(() => expect(search()).toHaveTextContent('?plan=nuevo'));
    expect(mocks.mutations.createPlan).toHaveBeenCalledWith({ name: 'Fuerza' });
    expect(mocks.notifySuccess).toHaveBeenCalledWith('Plan creado');
  });

  it('el botón "Nuevo plan" de la cabecera abre el modal con el contador N/120', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Nuevo plan' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo plan' });
    expect(within(dialog).getByText('0/120')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Nombre/ }), 'Fuerza');
    expect(within(dialog).getByText('6/120')).toBeInTheDocument();
  });

  it('un doble envío del nombre crea el plan una sola vez', async () => {
    mocks.mutations.createPlan.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(planDetail({ id: 'nuevo' })), 50))
    );
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Nuevo plan' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo plan' });
    const input = within(dialog).getByRole('textbox', { name: /Nombre/ });
    await userEvent.type(input, 'Fuerza');
    await userEvent.dblClick(within(dialog).getByRole('button', { name: 'Crear plan' }));

    await waitFor(() => expect(mocks.notifySuccess).toHaveBeenCalledWith('Plan creado'));
    expect(mocks.mutations.createPlan).toHaveBeenCalledTimes(1);
  });

  it('un nombre vacío muestra "Ponele un nombre al plan" sin llamar a la API', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Nuevo plan' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo plan' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Nombre/ }), '   ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear plan' }));

    expect(await within(dialog).findByText('Ponele un nombre al plan')).toBeInTheDocument();
    expect(mocks.mutations.createPlan).not.toHaveBeenCalled();
  });

  it('en el alta "Crear plan" arranca deshabilitado hasta escribir', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Nuevo plan' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo plan' });
    expect(within(dialog).getByRole('button', { name: 'Crear plan' })).toBeDisabled();

    await userEvent.type(within(dialog).getByRole('textbox', { name: /Nombre/ }), 'A');
    expect(within(dialog).getByRole('button', { name: 'Crear plan' })).toBeEnabled();
  });

  it('tras eliminar un plan no vuelve a abrir el recordado sino el primero del estado', async () => {
    localStorage.setItem('omni.gym.lastPlan.ana', 'a2');
    mocks.confirm.mockResolvedValue(true);
    renderPage();
    expect(shown()).toHaveTextContent('a2');

    await userEvent.click(await planMenuItem('Eliminar plan'));

    await waitFor(() => expect(shown()).toHaveTextContent('a1'));
  });

  it('mientras archiva el plan sigue elegido aunque el listado lo traiga con el estado viejo', async () => {
    let finish: (value: unknown) => void = () => undefined;
    mocks.mutations.archivePlan.mockReturnValue(new Promise(resolve => (finish = resolve)));
    renderPage('/gym?plan=a2');

    await userEvent.click(await planMenuItem('Archivar plan'));

    expect(shown()).toHaveTextContent('a2');
    expect(screen.queryByText('No tenés planes archivados')).not.toBeInTheDocument();
    finish(planDetail());
    await waitFor(() => expect(mocks.notifySuccess).toHaveBeenCalledWith('Plan archivado'));
  });

  it('si crear falla avisa con un toast, deja el modal abierto y recarga la lista', async () => {
    mocks.mutations.createPlan.mockRejectedValue(new Error('timeout'));
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Nuevo plan' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo plan' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Nombre/ }), 'Fuerza');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear plan' }));

    await waitFor(() => expect(mocks.notifyError).toHaveBeenCalledWith('No se pudo crear el plan'));
    expect(screen.getByRole('dialog', { name: 'Nuevo plan' })).toBeInTheDocument();
    expect(mocks.plans.mutate).toHaveBeenCalled();
  });

  it('sin plan en la URL muestra el primer plan activo con las acciones en la cabecera', () => {
    renderPage();

    expect(shown()).toHaveTextContent('a1');
    expect(screen.getByRole('combobox', { name: 'Plan' })).toHaveValue('Fuerza 3 días');
    expect(screen.getByRole('button', { name: 'Nuevo plan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar ejercicio' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archivar plan' })).not.toBeInTheDocument();
  });

  it('sin plan en la URL abre el último plan visto en el dispositivo', () => {
    localStorage.setItem('omni.gym.lastPlan.ana', 'a2');
    renderPage();

    expect(shown()).toHaveTextContent('a2');
  });

  it('recuerda el plan abierto', async () => {
    renderPage('/gym?plan=a2');

    await waitFor(() => expect(localStorage.getItem('omni.gym.lastPlan.ana')).toBe('a2'));
  });

  it('el plan de la URL elige el plan y su estado: archivado solo ofrece desarchivar y eliminar, sin menú', () => {
    renderPage('/gym?plan=z1');

    expect(shown()).toHaveTextContent('z1');
    expect(screen.getByRole('radio', { name: 'Archivados' })).toBeChecked();
    expect(screen.getByText('Archivado · solo lectura')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desarchivar plan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar plan' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acciones del plan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar ejercicio' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo plan' })).not.toBeInTheDocument();
  });

  it('pasar a Archivados elige el primer archivado y lo deja en la URL', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('radio', { name: 'Archivados' }));

    expect(shown()).toHaveTextContent('z1');
    expect(search()).toHaveTextContent('?plan=z1');
  });

  it('sin planes archivados lo dice', async () => {
    mocks.plans = { ...mocks.plans, plans: PLANS.filter(plan => plan.status === 'ACTIVE') };
    renderPage();

    await userEvent.click(screen.getByRole('radio', { name: 'Archivados' }));

    expect(screen.getByText('No tenés planes archivados')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Plan mostrado' })).not.toBeInTheDocument();
  });

  it('sin planes activos pero con archivados ofrece crear uno y "Ver archivados"', async () => {
    mocks.plans = { ...mocks.plans, plans: PLANS.filter(plan => plan.status === 'ARCHIVED') };
    renderPage('/gym?plan=nada');

    expect(screen.getByText('No tenés planes activos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear plan' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver archivados' }));
    expect(shown()).toHaveTextContent('z1');
  });

  it('"Agregar ejercicio" abre el alta del plan mostrado con el día de hoy', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 18));
    renderPage('/gym?plan=a2');

    await userEvent.click(screen.getByRole('button', { name: 'Agregar ejercicio' }), { delay: null });

    expect(shown()).toHaveTextContent('a2 + alta WEDNESDAY');
    vi.useRealTimers();
  });

  it('archivar (desde el menú) no pide confirmación, deja el plan elegido y pasa el filtro a Archivados', async () => {
    renderPage('/gym?plan=a2');

    await userEvent.click(await planMenuItem('Archivar plan'));

    await waitFor(() => expect(mocks.mutations.archivePlan).toHaveBeenCalledWith('a2'));
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: 'Archivados' })).toBeChecked();
    expect(search()).toHaveTextContent('?plan=a2');
    expect(mocks.notifySuccess).toHaveBeenCalledWith('Plan archivado');
  });

  it('desarchivar un plan archivado', async () => {
    renderPage('/gym?plan=z1');

    await userEvent.click(screen.getByRole('button', { name: 'Desarchivar plan' }));

    await waitFor(() => expect(mocks.mutations.unarchivePlan).toHaveBeenCalledWith('z1'));
    expect(mocks.notifySuccess).toHaveBeenCalledWith('Plan desarchivado');
  });

  it('si falla archivar lo avisa con el mensaje de la API y recarga la lista', async () => {
    mocks.mutations.archivePlan.mockRejectedValue(new ApiError('Plan no encontrado', 404));
    renderPage();

    await userEvent.click(await planMenuItem('Archivar plan'));

    await waitFor(() => expect(mocks.notifyError).toHaveBeenCalledWith('Plan no encontrado'));
    expect(mocks.plans.mutate).toHaveBeenCalled();
  });

  it('el menú renombra el plan con su nombre precargado y "Guardar nombre" arranca deshabilitado', async () => {
    renderPage('/gym?plan=a2');

    await userEvent.click(await planMenuItem('Renombrar plan'));
    const dialog = await screen.findByRole('dialog', { name: 'Renombrar plan' });
    const input = within(dialog).getByRole('textbox', { name: /Nombre/ });
    expect(input).toHaveValue('Hipertrofia');
    expect(within(dialog).getByRole('button', { name: 'Guardar nombre' })).toBeDisabled();

    await userEvent.clear(input);
    await userEvent.type(input, 'Hipertrofia 4 días');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar nombre' }));

    await waitFor(() => expect(mocks.mutations.renamePlan).toHaveBeenCalledWith('a2', { name: 'Hipertrofia 4 días' }));
    expect(mocks.notifySuccess).toHaveBeenCalledWith('Plan renombrado');
  });

  it('si renombrar falla con un 409 (se archivó) avisa y cierra el modal', async () => {
    mocks.mutations.renamePlan.mockRejectedValue(new ApiError('El plan está archivado', 409));
    renderPage();

    await userEvent.click(await planMenuItem('Renombrar plan'));
    const dialog = await screen.findByRole('dialog', { name: 'Renombrar plan' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Nombre/ }), '!');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar nombre' }));

    await waitFor(() => expect(mocks.notifyError).toHaveBeenCalledWith('El plan está archivado'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Renombrar plan' })).not.toBeInTheDocument());
  });

  it('eliminar un plan pide confirmación con sus días y ejercicios, lo borra y vuelve al primero del estado', async () => {
    mocks.confirm.mockResolvedValue(true);
    renderPage('/gym?plan=a1');

    await userEvent.click(await planMenuItem('Eliminar plan'));

    expect(mocks.confirm).toHaveBeenCalledWith({
      title: '¿Eliminar el plan?',
      description:
        'Se borran Fuerza 3 días, sus 3 días y 8 ejercicios. Los ejercicios que no uses en otro plan se borran con su peso y su historial. No se puede deshacer.',
      confirmLabel: 'Eliminar plan',
    });
    await waitFor(() => expect(search()).toBeEmptyDOMElement());
    expect(mocks.mutations.deletePlan).toHaveBeenCalledWith('a1');
    expect(mocks.notifySuccess).toHaveBeenCalledWith('Plan eliminado');
  });

  it('un plan sin ejercicios lo dice en la confirmación', async () => {
    mocks.confirm.mockResolvedValue(false);
    renderPage('/gym?plan=a2');

    await userEvent.click(await planMenuItem('Eliminar plan'));

    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Se borra Hipertrofia, que no tiene ejercicios. No se puede deshacer.' })
    );
  });

  it('un plan archivado también se elimina con confirmación', async () => {
    mocks.confirm.mockResolvedValue(true);
    renderPage('/gym?plan=z1');

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar plan' }));

    await waitFor(() => expect(mocks.mutations.deletePlan).toHaveBeenCalledWith('z1'));
  });

  it('si se cancela la confirmación no borra el plan', async () => {
    mocks.confirm.mockResolvedValue(false);
    renderPage();

    await userEvent.click(await planMenuItem('Eliminar plan'));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.mutations.deletePlan).not.toHaveBeenCalled();
  });

  it('si el día en modo orden ya no existe en el plan la cabecera no queda bloqueada', async () => {
    mocks.openPlan = { plan: planDetail({ days: [] }) };
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Simular orden' }));

    expect(screen.getByRole('button', { name: 'Nuevo plan' })).toBeEnabled();
  });

  it('en modo orden la cabecera queda deshabilitada pero el selector de plan no', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Simular orden' }));

    expect(screen.getByRole('button', { name: 'Nuevo plan' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Agregar ejercicio' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Plan' })).toBeEnabled();
  });
});
