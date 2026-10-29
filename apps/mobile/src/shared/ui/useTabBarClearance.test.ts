import { renderHook } from '@testing-library/react-native';

import { tabBarBottomOffset, useTabBarClearance } from './useTabBarClearance';

let mockInsetBottom = 0;

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: mockInsetBottom, left: 0, right: 0 }),
}));

describe('tabBarBottomOffset', () => {
  it('separa la tab bar 24 del borde, o el inset del sistema si es mayor', () => {
    expect(tabBarBottomOffset(0)).toBe(24);
    expect(tabBarBottomOffset(16)).toBe(24);
    expect(tabBarBottomOffset(48)).toBe(48);
  });
});

describe('useTabBarClearance', () => {
  it('reserva el alto de la barra, su distancia al borde y 16 de aire', () => {
    mockInsetBottom = 0;
    expect(renderHook(() => useTabBarClearance()).result.current).toBe(72 + 24 + 16);

    mockInsetBottom = 48;
    expect(renderHook(() => useTabBarClearance()).result.current).toBe(72 + 48 + 16);
  });
});
