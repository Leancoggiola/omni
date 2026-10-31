import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';
import { ApiError } from '@/shared/api';

import { JoinHouseholdModal } from '../components/JoinHouseholdModal';

import type { HouseholdInvitePreview } from '@omni/shared/household';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const notifySuccess = vi.hoisted(() => vi.fn());

vi.mock('@/shared/ui', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/ui')>()),
  notifySuccess,
}));

const preview: HouseholdInvitePreview = {
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

const onClose = vi.fn();
const onPreview = vi.fn();
const onAccept = vi.fn();

function renderModal() {
  renderWithProviders(<JoinHouseholdModal opened onClose={onClose} onPreview={onPreview} onAccept={onAccept} />);
}

async function typeCodeAndReview(code = 'k7m2-qx4p') {
  await userEvent.type(screen.getByLabelText('Código de invitación'), code);
  await userEvent.click(screen.getByRole('button', { name: 'Revisar invitación' }));
}

describe('JoinHouseholdModal', () => {
  beforeEach(() => {
    onClose.mockReset();
    onPreview.mockReset().mockResolvedValue(preview);
    onAccept.mockReset().mockResolvedValue(undefined);
    notifySuccess.mockReset();
  });

  it('no deja revisar un código incompleto', async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText('Código de invitación'), 'K7M2');

    expect(screen.getByRole('button', { name: 'Revisar invitación' })).toBeDisabled();
    expect(screen.queryByText(/Se lee como/)).not.toBeInTheDocument();
  });

  it('normaliza lo que se escribe y muestra cómo se lee', async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText('Código de invitación'), 'k7m2-qx4p');

    expect(screen.getByText('K7M2 QX4P')).toBeInTheDocument();
  });

  it('revisa con el código normalizado y muestra lo que aporta y los repetidos', async () => {
    renderModal();
    await typeCodeAndReview();

    expect(await screen.findByText('Revisá antes de unirte')).toBeInTheDocument();
    expect(onPreview).toHaveBeenCalledWith('K7M2QX4P');
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('3 repetidos se descartan')).toBeInTheDocument();
    expect(screen.getByText('Dune: Parte dos')).toBeInTheDocument();
    expect(screen.getByText('Yerba mate')).toBeInTheDocument();
  });

  it('sin repetidos no muestra la sección de descartados', async () => {
    onPreview.mockResolvedValue({ ...preview, conflicts: { media: [], pantry: [] } });
    renderModal();
    await typeCodeAndReview();

    await screen.findByText('Revisá antes de unirte');
    expect(screen.queryByText(/se descarta/)).not.toBeInTheDocument();
  });

  it('un 404 muestra el mensaje único de código inválido', async () => {
    onPreview.mockRejectedValue(new ApiError('Código inválido', 404));
    renderModal();
    await typeCodeAndReview('K7M2QX4Z');

    expect(
      await screen.findByText('Este código no es válido o ya venció. Pedile a tu pareja uno nuevo.')
    ).toBeInTheDocument();
  });

  it('un 429 muestra el mensaje genérico', async () => {
    onPreview.mockRejectedValue(new ApiError('Demasiados intentos', 429));
    renderModal();
    await typeCodeAndReview();

    expect(await screen.findByText(/Probaste muchas veces seguidas/)).toBeInTheDocument();
  });

  it('un 409 muestra el texto de la API', async () => {
    onPreview.mockRejectedValue(new ApiError('Ese hogar ya tiene el máximo de integrantes', 409));
    renderModal();
    await typeCodeAndReview();

    expect(await screen.findByText('Ese hogar ya tiene el máximo de integrantes')).toBeInTheDocument();
  });

  it('aceptar manda el mismo código, avisa y cierra', async () => {
    renderModal();
    await typeCodeAndReview();
    await userEvent.click(await screen.findByRole('button', { name: 'Unirme al hogar de Lucía' }));

    await waitFor(() => expect(onAccept).toHaveBeenCalledWith('K7M2QX4P'));
    expect(notifySuccess).toHaveBeenCalledWith('Ya compartís tu hogar con Lucía');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('si aceptar falla queda en la vista previa con el error', async () => {
    onAccept.mockRejectedValue(new ApiError('Tu hogar cambió mientras se procesaba la unión', 409));
    renderModal();
    await typeCodeAndReview();
    await userEvent.click(await screen.findByRole('button', { name: 'Unirme al hogar de Lucía' }));

    expect(await screen.findByText('Tu hogar cambió mientras se procesaba la unión')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
