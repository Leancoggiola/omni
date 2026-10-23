import { fireEvent, render, screen } from '@testing-library/react-native';

import { MeasuredTabBar } from './MeasuredTabBar';

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const mockSetOffset = jest.fn();
let mockFocused = true;

jest.mock('@react-navigation/bottom-tabs', () => ({ BottomTabBar: () => null }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
jest.mock('@/shared/ui', () => ({ useSetNotificationsBottomOffset: () => mockSetOffset }));

const props = {} as BottomTabBarProps;
const layout = (height: number) =>
  fireEvent(screen.getByTestId('measured-tab-bar'), 'layout', { nativeEvent: { layout: { height } } });

beforeEach(() => {
  mockSetOffset.mockClear();
  mockFocused = true;
});

describe('MeasuredTabBar', () => {
  it('informa su alto a las notificaciones y lo libera al desmontarse', () => {
    const { unmount } = render(<MeasuredTabBar {...props} />);

    layout(80);
    expect(mockSetOffset).toHaveBeenLastCalledWith(80);

    unmount();
    expect(mockSetOffset).toHaveBeenLastCalledWith(0);
  });

  it('sin foco (Perfil encima de las tabs) informa 0', () => {
    const { rerender } = render(<MeasuredTabBar {...props} />);
    layout(80);

    mockFocused = false;
    rerender(<MeasuredTabBar {...props} />);
    expect(mockSetOffset).toHaveBeenLastCalledWith(0);

    mockFocused = true;
    rerender(<MeasuredTabBar {...props} />);
    expect(mockSetOffset).toHaveBeenLastCalledWith(80);
  });
});
