import { fireEvent, render, screen } from '@testing-library/react-native';

import { PantryScreen } from './PantryScreen';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('@/shared/navigation', () => ({ NAV_ICONS: { pantry: () => null } }));
jest.mock('@/shared/ui', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    Screen: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    ScreenHeader: ({ action }: { action?: React.ReactNode }) => <View>{action}</View>,
    SegmentedControl: ({
      data,
      onChange,
    }: {
      data: { value: string; label: string }[];
      onChange: (v: string) => void;
    }) => (
      <View>
        {data.map(option => (
          <Pressable key={option.value} onPress={() => onChange(option.value)}>
            <Text>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    ),
  };
});
jest.mock('./components/InventoryView', () => ({ InventoryView: ({ header }: { header: React.ReactNode }) => header }));
jest.mock('./components/ShoppingListView', () => ({
  ShoppingListView: ({ header }: { header: React.ReactNode }) => header,
}));
const mockRevalidateOnFocus = jest.fn();
jest.mock('./hooks/useRevalidatePantryOnFocus', () => ({
  useRevalidatePantryOnFocus: () => mockRevalidateOnFocus(),
}));
jest.mock('./hooks/usePantrySummary', () => ({ usePantrySummary: () => ({ summary: { shoppingListCount: 0 } }) }));

let mockMembers = 2;
jest.mock('@/core/household', () => ({
  useHousehold: () => ({ household: { members: Array.from({ length: mockMembers }) } }),
}));

beforeEach(() => {
  mockMembers = 2;
});

describe('PantryScreen', () => {
  it('se engancha a la revalidación al volver a la pestaña', () => {
    render(<PantryScreen />);

    expect(mockRevalidateOnFocus).toHaveBeenCalled();
  });

  it('avisa que se actualiza solo únicamente en la lista de un hogar compartido', () => {
    render(<PantryScreen />);

    expect(screen.queryByText('Se actualiza solo')).toBeNull();
    fireEvent.press(screen.getByText('Lista de compras'));
    expect(screen.getByText('Se actualiza solo')).toBeTruthy();
  });

  it('sin vincular no muestra el aviso', () => {
    mockMembers = 1;
    render(<PantryScreen />);

    fireEvent.press(screen.getByText('Lista de compras'));
    expect(screen.queryByText('Se actualiza solo')).toBeNull();
  });
});
