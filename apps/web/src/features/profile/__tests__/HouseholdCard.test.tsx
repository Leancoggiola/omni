import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockAuthValue, renderWithProviders } from '@/__tests__/helpers';

import { HouseholdCard } from '../components/HouseholdCard';

import type { HouseholdInfo } from '@omni/shared/household';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  household: { household: null, isLoading: false, error: undefined, mutate: vi.fn() } as {
    household: HouseholdInfo | null;
    isLoading: boolean;
    error: Error | undefined;
    mutate: ReturnType<typeof vi.fn>;
  },
  actions: {
    createInvite: vi.fn(),
    revokeInvite: vi.fn(),
    previewInvite: vi.fn(),
    acceptInvite: vi.fn(),
    leaveHousehold: vi.fn(),
  },
  confirm: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock('@/core/auth', () => ({
  useAuth: () => createMockAuthValue({ user: { ...createMockAuthValue().user!, username: 'leo' } }),
}));
vi.mock('@/core/household', () => ({ useHousehold: () => mocks.household }));
vi.mock('../hooks/useHouseholdActions', () => ({ useHouseholdActions: () => mocks.actions }));
vi.mock('@/shared/ui', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/ui')>()),
  confirm: mocks.confirm,
  notifyError: mocks.notifyError,
  notifySuccess: mocks.notifySuccess,
}));

const me = { userId: 'u1', name: 'Leandro', username: 'leo', avatarUrl: null, joinedAt: '2026-10-31T00:00:00.000Z' };
const partner = {
  userId: 'u2',
  name: 'Lucía',
  username: 'lucia',
  avatarUrl: null,
  joinedAt: '2026-03-12T00:00:00.000Z',
};

const solo: HouseholdInfo = { id: 'h1', members: [me], pendingInvite: null };
const pending: HouseholdInfo = {
  id: 'h1',
  members: [me],
  pendingInvite: { id: 'i1', expiresAt: new Date(Date.now() + 31 * 3_600_000).toISOString() },
};
const linked: HouseholdInfo = { id: 'h1', members: [partner, me], pendingInvite: null };

const setHousehold = (household: HouseholdInfo | null, extra: Partial<typeof mocks.household> = {}) => {
  mocks.household = { household, isLoading: false, error: undefined, mutate: vi.fn(), ...extra };
};

describe('HouseholdCard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    Object.values(mocks.actions).forEach(action => action.mockReset().mockResolvedValue(undefined));
    mocks.confirm.mockReset().mockResolvedValue(true);
    mocks.notifyError.mockReset();
    mocks.notifySuccess.mockReset();
  });

  it('solo: ofrece invitar o ingresar un código', () => {
    setHousehold(solo);
    renderWithProviders(<HouseholdCard />);

    expect(screen.getByText('Todavía estás solo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invitar a mi pareja' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tengo un código' })).toBeInTheDocument();
  });

  it('invitar muestra el código recién generado una sola vez', async () => {
    setHousehold(solo);
    mocks.actions.createInvite.mockResolvedValue({
      id: 'i1',
      code: 'K7M2QX4P',
      expiresAt: new Date(Date.now() + 48 * 3_600_000).toISOString(),
    });
    renderWithProviders(<HouseholdCard />);

    await userEvent.click(screen.getByRole('button', { name: 'Invitar a mi pareja' }));

    expect(await screen.findByText('K7M2 QX4P')).toBeInTheDocument();
    expect(screen.getByText('Guardalo ahora')).toBeInTheDocument();
  });

  it('si no se puede generar la invitación avisa con el mensaje de la API', async () => {
    setHousehold(solo);
    mocks.actions.createInvite.mockRejectedValue(new Error('x'));
    renderWithProviders(<HouseholdCard />);

    await userEvent.click(screen.getByRole('button', { name: 'Invitar a mi pareja' }));

    await waitFor(() => expect(mocks.notifyError).toHaveBeenCalledWith('No pudimos generar la invitación'));
  });

  it('pendiente: aclara que el código no se vuelve a mostrar y permite revocar', async () => {
    setHousehold(pending);
    renderWithProviders(<HouseholdCard />);

    expect(screen.getByText('Invitación vigente')).toBeInTheDocument();
    expect(screen.getByText(/no podemos volver a mostrar el código/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Revocar invitación' }));

    await waitFor(() => expect(mocks.actions.revokeInvite).toHaveBeenCalledOnce());
    expect(mocks.notifySuccess).toHaveBeenCalled();
  });

  it('pendiente: generar un código nuevo pide confirmación y no genera si se cancela', async () => {
    setHousehold(pending);
    mocks.confirm.mockResolvedValue(false);
    renderWithProviders(<HouseholdCard />);

    await userEvent.click(screen.getByRole('button', { name: 'Generar un código nuevo' }));

    expect(mocks.confirm).toHaveBeenCalledOnce();
    expect(mocks.actions.createInvite).not.toHaveBeenCalled();
  });

  it('vinculado: lista a los dos, marca "Vos" y no ofrece "Tengo un código"', () => {
    setHousehold(linked);
    renderWithProviders(<HouseholdCard />);

    expect(screen.getByText('Lucía')).toBeInTheDocument();
    expect(screen.getByText('Vos')).toBeInTheDocument();
    expect(screen.getByText('2 de 2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tengo un código' })).not.toBeInTheDocument();
  });

  it('vinculado: el aviso de push se descarta y no vuelve en la sesión', async () => {
    setHousehold(linked);
    const { unmount } = renderWithProviders(<HouseholdCard />);
    expect(screen.getByText(/No hay notificaciones push/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Descartar aviso' }));
    expect(screen.queryByText(/No hay notificaciones push/)).not.toBeInTheDocument();

    unmount();
    renderWithProviders(<HouseholdCard />);
    expect(screen.queryByText(/No hay notificaciones push/)).not.toBeInTheDocument();
  });

  it('desvincular confirma y recién ahí llama a la API', async () => {
    setHousehold(linked);
    renderWithProviders(<HouseholdCard />);

    await userEvent.click(screen.getByRole('button', { name: 'Desvincular' }));

    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Desvincular a Lucía?' }));
    await waitFor(() => expect(mocks.actions.leaveHousehold).toHaveBeenCalledOnce());
  });

  it('desvincular cancelado no llama a la API', async () => {
    setHousehold(linked);
    mocks.confirm.mockResolvedValue(false);
    renderWithProviders(<HouseholdCard />);

    await userEvent.click(screen.getByRole('button', { name: 'Desvincular' }));

    expect(mocks.actions.leaveHousehold).not.toHaveBeenCalled();
  });

  it('si desvincular falla avisa y no cierra nada', async () => {
    setHousehold(linked);
    mocks.actions.leaveHousehold.mockRejectedValue(new Error('x'));
    renderWithProviders(<HouseholdCard />);

    await userEvent.click(screen.getByRole('button', { name: 'Desvincular' }));

    await waitFor(() => expect(mocks.notifyError).toHaveBeenCalledWith('No pudimos desvincular'));
  });

  it('con error de carga muestra el ErrorState y reintenta', async () => {
    setHousehold(null, { error: new Error('x') });
    renderWithProviders(<HouseholdCard />);

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(mocks.household.mutate).toHaveBeenCalledOnce();
  });
});
