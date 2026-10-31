import { ApiError } from '@omni/shared/api';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { JoinHouseholdSheet } from './JoinHouseholdSheet';

import type { HouseholdInvitePreview } from '@omni/shared/household';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default
);

const PREVIEW: HouseholdInvitePreview = {
  inviter: { name: 'Lucía' },
  contributes: { mediaCount: 128, pantryProductCount: 42, shoppingItemCount: 9 },
  conflicts: {
    media: [
      { tmdbId: 1, mediaType: 'movie', title: 'Dune: Parte dos' },
      { tmdbId: 2, mediaType: 'tv', title: 'Severance' },
    ],
    pantry: [{ name: 'Yerba mate' }],
  },
};

const onOpenChange = jest.fn();
const onPreview = jest.fn();
const onAccept = jest.fn();
const onJoined = jest.fn();
const onClosed = jest.fn();

function renderSheet() {
  render(
    <JoinHouseholdSheet
      open
      onOpenChange={onOpenChange}
      onPreview={onPreview}
      onAccept={onAccept}
      onJoined={onJoined}
      onClosed={onClosed}
    />
  );
}

async function typeCodeAndReview(code = 'k7m2-qx4p') {
  fireEvent.changeText(screen.getByLabelText('Código de invitación'), code);
  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Revisar invitación' })));
}

beforeEach(() => {
  jest.clearAllMocks();
  onPreview.mockResolvedValue(PREVIEW);
  onAccept.mockResolvedValue(undefined);
});

describe('JoinHouseholdSheet', () => {
  it('no deja revisar un código incompleto', () => {
    renderSheet();
    fireEvent.changeText(screen.getByLabelText('Código de invitación'), 'K7M2');

    expect(screen.getByRole('button', { name: 'Revisar invitación' }).props.accessibilityState?.disabled).toBe(true);
    expect(screen.queryByText(/Se lee como/)).toBeNull();
  });

  it('normaliza lo que se escribe y muestra cómo se lee', () => {
    renderSheet();
    fireEvent.changeText(screen.getByLabelText('Código de invitación'), 'k7m2-qx4p');

    expect(screen.getByText('Se lee como K7M2 QX4P')).toBeTruthy();
  });

  it('revisa con el código normalizado y muestra lo que aporta y los repetidos', async () => {
    renderSheet();
    await typeCodeAndReview();

    expect(onPreview).toHaveBeenCalledWith('K7M2QX4P');
    expect(screen.getByText('Revisá y unite')).toBeTruthy();
    expect(screen.getByLabelText('128 películas y series')).toBeTruthy();
    expect(screen.getByText('3 repetidos se descartan')).toBeTruthy();
    expect(screen.getByText('Dune: Parte dos')).toBeTruthy();
    expect(screen.getByText('Yerba mate')).toBeTruthy();
  });

  it('sin repetidos no muestra la sección de descartados', async () => {
    onPreview.mockResolvedValue({ ...PREVIEW, conflicts: { media: [], pantry: [] } });
    renderSheet();
    await typeCodeAndReview();

    expect(screen.getByText('Revisá y unite')).toBeTruthy();
    expect(screen.queryByText(/se descarta/)).toBeNull();
  });

  it('un 404 muestra el mensaje único de código inválido', async () => {
    onPreview.mockRejectedValue(new ApiError('Código inválido', 404));
    renderSheet();
    await typeCodeAndReview('K7M2QX4Z');

    expect(screen.getByText('Este código no es válido o ya venció. Pedile a tu pareja uno nuevo.')).toBeTruthy();
  });

  it('un 429 muestra el mensaje genérico', async () => {
    onPreview.mockRejectedValue(new ApiError('Demasiados intentos', 429));
    renderSheet();
    await typeCodeAndReview();

    expect(screen.getByText(/Probaste muchas veces seguidas/)).toBeTruthy();
  });

  it('un 409 muestra el texto de la API', async () => {
    onPreview.mockRejectedValue(new ApiError('Ese hogar ya tiene el máximo de integrantes', 409));
    renderSheet();
    await typeCodeAndReview();

    expect(screen.getByText('Ese hogar ya tiene el máximo de integrantes')).toBeTruthy();
  });

  it('aceptar manda el mismo código, avisa quién invitó y cierra', async () => {
    renderSheet();
    await typeCodeAndReview();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Unirme al hogar de Lucía' })));

    await waitFor(() => expect(onAccept).toHaveBeenCalledWith('K7M2QX4P'));
    expect(onJoined).toHaveBeenCalledWith('Lucía');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('si aceptar falla queda en la vista previa con el error y no cierra', async () => {
    onAccept.mockRejectedValue(new ApiError('Tu hogar cambió mientras se procesaba la unión', 409));
    renderSheet();
    await typeCodeAndReview();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Unirme al hogar de Lucía' })));

    expect(screen.getByText('Tu hogar cambió mientras se procesaba la unión')).toBeTruthy();
    expect(onJoined).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
