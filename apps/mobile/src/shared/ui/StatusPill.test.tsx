import { fireEvent, render, screen } from '@testing-library/react-native';

import { StatusPill } from './StatusPill';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

describe('StatusPill', () => {
  it('es una pill de 28 de alto con los tokens de cada estado', () => {
    const { rerender } = render(<StatusPill status="to_watch" />);
    const pill = () => screen.getByLabelText(/^Estado:/);

    expect(pill()).toHaveProp('height', 28);
    expect(pill()).toHaveProp('backgroundColor', '$disabledSurface');
    expect(pill()).toHaveProp('borderColor', '$borderSubtle');

    rerender(<StatusPill status="watching" />);
    expect(pill()).toHaveProp('backgroundColor', '$accentSurface');

    rerender(<StatusPill status="watched" />);
    expect(pill()).toHaveProp('backgroundColor', '$successSurface');
  });

  it('con onPress es un botón que abre el selector; sin onPress es solo texto', () => {
    const onPress = jest.fn();
    const { rerender } = render(<StatusPill status="watching" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Estado: Viendo. Cambiar estado' }));
    expect(onPress).toHaveBeenCalledTimes(1);

    rerender(<StatusPill status="watching" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByLabelText('Estado: Viendo')).toBeTruthy();
  });
});
