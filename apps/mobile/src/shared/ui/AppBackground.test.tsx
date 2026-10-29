import { render } from '@testing-library/react-native';
import { RadialGradient } from 'react-native-svg';

import { AppBackground } from './AppBackground';

jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

describe('AppBackground', () => {
  it('es decorativo: no recibe toques ni lo lee TalkBack', () => {
    const { toJSON } = render(<AppBackground />);
    const root = toJSON() as { props: Record<string, unknown> };

    expect(root.props.pointerEvents).toBe('none');
    expect(root.props.accessibilityElementsHidden).toBe(true);
    expect(root.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('dibuja las dos manchas', () => {
    const { UNSAFE_getAllByType } = render(<AppBackground />);

    expect(UNSAFE_getAllByType(RadialGradient)).toHaveLength(2);
  });
});
