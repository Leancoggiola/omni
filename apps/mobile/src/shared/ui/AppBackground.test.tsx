import { render, screen } from '@testing-library/react-native';

import { AppBackground } from './AppBackground';

jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

describe('AppBackground', () => {
  it('es decorativo: no recibe toques ni lo lee TalkBack', async () => {
    const { toJSON } = await render(<AppBackground />);
    const root = toJSON() as { props: Record<string, unknown> };

    expect(root.props.pointerEvents).toBe('none');
    expect(root.props.accessibilityElementsHidden).toBe(true);
    expect(root.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('dibuja las dos manchas', async () => {
    await render(<AppBackground />);

    expect(screen.container.queryAll(node => node.type === 'RNSVGRadialGradient')).toHaveLength(2);
  });
});
