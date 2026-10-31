import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { confirm, notifyError, notifySuccess } from '@/shared/ui';

import { resetPushNoticeDismissal } from '../utils/pushNoticeDismissal';
import { HouseholdCard } from './HouseholdCard';

import type { HouseholdInfo } from '@omni/shared/household';

const mockHousehold = jest.fn();
const mockActions = {
  createInvite: jest.fn(),
  revokeInvite: jest.fn(),
  previewInvite: jest.fn(),
  acceptInvite: jest.fn(),
  leaveHousehold: jest.fn(),
};

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('@/core/auth', () => ({ useAuth: () => ({ user: { username: 'leo' } }) }));
jest.mock('@/core/household', () => ({ useHousehold: () => mockHousehold() }));
jest.mock('@/shared/ui', () => ({
  ...jest.requireActual('@/shared/ui'),
  confirm: jest.fn(),
  notifySuccess: jest.fn(),
  notifyError: jest.fn(),
}));
jest.mock('../hooks/useHouseholdActions', () => ({ useHouseholdActions: () => mockActions }));

const ME = { userId: 'u1', name: 'Leandro', username: 'leo', avatarUrl: null, joinedAt: '2026-10-31T00:00:00.000Z' };
const PARTNER = {
  userId: 'u2',
  name: 'Lucía',
  username: 'lucia',
  avatarUrl: null,
  joinedAt: '2026-03-12T00:00:00.000Z',
};

const SOLO: HouseholdInfo = { id: 'h1', members: [ME], pendingInvite: null };
const PENDING: HouseholdInfo = {
  id: 'h1',
  members: [ME],
  pendingInvite: { id: 'i1', expiresAt: new Date(Date.now() + 31 * 3_600_000).toISOString() },
};
const LINKED: HouseholdInfo = { id: 'h1', members: [PARTNER, ME], pendingInvite: null };

const mutate = jest.fn();

function show(household: HouseholdInfo | null, extra: Record<string, unknown> = {}) {
  mockHousehold.mockReturnValue({ household, isLoading: false, error: undefined, mutate, ...extra });
}

const press = (name: string) => act(async () => fireEvent.press(screen.getByRole('button', { name })));

beforeEach(() => {
  jest.clearAllMocks();
  resetPushNoticeDismissal();
  Object.values(mockActions).forEach(action => action.mockResolvedValue(undefined));
  jest.mocked(confirm).mockResolvedValue(true);
});

describe('HouseholdCard', () => {
  it('solo: ofrece invitar o ingresar un código', () => {
    show(SOLO);
    render(<HouseholdCard />);

    expect(screen.getByText('Todavía estás solo')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Invitar a mi pareja' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tengo un código' })).toBeTruthy();
  });

  it('invitar muestra el código recién generado', async () => {
    show(SOLO);
    mockActions.createInvite.mockResolvedValue({
      id: 'i1',
      code: 'K7M2QX4P',
      expiresAt: new Date(Date.now() + 48 * 3_600_000).toISOString(),
    });
    render(<HouseholdCard />);

    await press('Invitar a mi pareja');

    expect(await screen.findByText('K7M2 QX4P')).toBeTruthy();
  });

  it('si no se puede generar la invitación avisa con notifyError', async () => {
    show(SOLO);
    mockActions.createInvite.mockRejectedValue(new Error('x'));
    render(<HouseholdCard />);

    await press('Invitar a mi pareja');

    expect(notifyError).toHaveBeenCalledWith('No pudimos generar la invitación');
  });

  it('pendiente: aclara que el código no se vuelve a mostrar y permite revocar', async () => {
    show(PENDING);
    render(<HouseholdCard />);

    expect(screen.getByText(/no podemos volver a mostrar el código/)).toBeTruthy();

    await press('Revocar invitación');

    expect(mockActions.revokeInvite).toHaveBeenCalledTimes(1);
    expect(notifySuccess).toHaveBeenCalled();
  });

  it('pendiente: generar un código nuevo pide confirmación y no genera si se cancela', async () => {
    show(PENDING);
    jest.mocked(confirm).mockResolvedValue(false);
    render(<HouseholdCard />);

    await press('Generar un código nuevo');

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(mockActions.createInvite).not.toHaveBeenCalled();
  });

  it('vinculado: lista a los dos, marca "vos" y no ofrece "Tengo un código"', () => {
    show(LINKED);
    render(<HouseholdCard />);

    expect(screen.getByText('Lucía')).toBeTruthy();
    expect(screen.getByText('Leandro (vos)')).toBeTruthy();
    expect(screen.getByText('2 de 2')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tengo un código' })).toBeNull();
  });

  it('vinculado: el aviso de push se descarta y no vuelve en la sesión', async () => {
    show(LINKED);
    const { unmount } = render(<HouseholdCard />);
    expect(screen.getByText(/No hay notificaciones push/)).toBeTruthy();

    await press('Entendido');
    expect(screen.queryByText(/No hay notificaciones push/)).toBeNull();

    unmount();
    render(<HouseholdCard />);
    expect(screen.queryByText(/No hay notificaciones push/)).toBeNull();
  });

  it('desvincular confirma y recién ahí llama a la API', async () => {
    show(LINKED);
    render(<HouseholdCard />);

    await press('Desvincular');

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Desvincular a Lucía?' }));
    await waitFor(() => expect(mockActions.leaveHousehold).toHaveBeenCalledTimes(1));
  });

  it('desvincular cancelado no llama a la API', async () => {
    show(LINKED);
    jest.mocked(confirm).mockResolvedValue(false);
    render(<HouseholdCard />);

    await press('Desvincular');

    expect(mockActions.leaveHousehold).not.toHaveBeenCalled();
  });

  it('si desvincular falla avisa con notifyError', async () => {
    show(LINKED);
    mockActions.leaveHousehold.mockRejectedValue(new Error('x'));
    render(<HouseholdCard />);

    await press('Desvincular');

    expect(notifyError).toHaveBeenCalledWith('No pudimos desvincular');
  });

  it('con error de carga muestra el ErrorState y reintenta', async () => {
    show(null, { error: new Error('x') });
    render(<HouseholdCard />);

    await press('Reintentar');

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('mientras carga muestra el estado de carga', () => {
    show(null, { isLoading: true });
    render(<HouseholdCard />);

    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
  });
});
