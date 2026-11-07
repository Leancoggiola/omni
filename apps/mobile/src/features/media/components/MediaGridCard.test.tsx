import { fireEvent, render, screen } from '@testing-library/react-native';

import { MediaGridCard } from './MediaGridCard';

import type { MediaItem } from '@omni/shared/media';

const mockAuthor = jest.fn();

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('@/core/household', () => ({ useItemAuthor: (id: string | null) => mockAuthor(id) }));

const ITEM: MediaItem = {
  id: '1',
  createdById: 'u1',
  tmdbId: 1,
  mediaType: 'tv',
  title: 'The Bear',
  posterPath: null,
  status: 'watching',
  createdAt: '',
  updatedAt: '',
};

function renderCard() {
  const onStatusPress = jest.fn();
  const onDeletePress = jest.fn();
  render(<MediaGridCard item={ITEM} onStatusPress={onStatusPress} onDeletePress={onDeletePress} />);
  return { onStatusPress, onDeletePress };
}

describe('MediaGridCard', () => {
  beforeEach(() => mockAuthor.mockReset());

  it('muestra título, badge de tipo, pill de estado y tacho con el nombre del ítem', () => {
    renderCard();

    expect(screen.getByText('The Bear')).toBeTruthy();
    expect(screen.getByText('Serie')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Estado de The Bear: Viendo. Cambiar estado' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Eliminar The Bear' })).toBeTruthy();
  });

  it('la pill y el tacho llaman a sus handlers con el ítem', () => {
    const { onStatusPress, onDeletePress } = renderCard();

    fireEvent.press(screen.getByRole('button', { name: 'Estado de The Bear: Viendo. Cambiar estado' }));
    fireEvent.press(screen.getByRole('button', { name: 'Eliminar The Bear' }));

    expect(onStatusPress).toHaveBeenCalledWith(ITEM);
    expect(onDeletePress).toHaveBeenCalledWith(ITEM);
  });

  it('muestra el autor solo si el ítem es compartido', () => {
    renderCard();
    expect(screen.queryByLabelText(/Agregado por/)).toBeNull();
  });

  it('con autor resuelto muestra el AuthorTag', () => {
    mockAuthor.mockReturnValue({ kind: 'self', name: 'Leandro', avatarUrl: null });
    renderCard();
    expect(screen.getByLabelText('Agregado por Vos')).toBeTruthy();
  });
});
