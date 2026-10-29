import { fireEvent, render, screen } from '@testing-library/react-native';
import { FilmSlateIcon } from 'phosphor-react-native';

import { ScreenHeader } from './ScreenHeader';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

describe('ScreenHeader', () => {
  it('muestra el título en display con la última palabra en primary y el subtítulo', () => {
    render(<ScreenHeader icon={FilmSlateIcon} title="Películas y Series" subtitle="Tu lista de seguimiento" />);

    expect(screen.getByRole('header', { name: 'Películas y Series' })).toHaveProp('fontFamily', '$display');
    expect(screen.getByText('Series')).toHaveProp('color', '$primary');
    expect(screen.getByText('Tu lista de seguimiento')).toBeTruthy();
  });

  it('`accent` elige otra palabra entera del título', () => {
    render(<ScreenHeader icon={FilmSlateIcon} title="Mi Perfil de usuario" accent="Perfil" />);

    expect(screen.getByText('Perfil')).toHaveProp('color', '$primary');
    expect(screen.queryByText('usuario')).toBeNull();
  });

  it('un título de una sola palabra, o un acento que no es una palabra suya, no se resalta', () => {
    const { rerender } = render(<ScreenHeader icon={FilmSlateIcon} title="Más" />);
    expect(screen.queryByText('Más', { exact: true })).toBeTruthy();
    expect(screen.UNSAFE_queryByProps({ color: '$primary' })).toBeNull();

    rerender(<ScreenHeader icon={FilmSlateIcon} title="Mi Perfil" accent="Per" />);
    expect(screen.UNSAFE_queryByProps({ color: '$primary' })).toBeNull();
  });

  it('con onBack suma el botón de volver', () => {
    const onBack = jest.fn();
    render(<ScreenHeader icon={FilmSlateIcon} title="Mi Perfil" onBack={onBack} />);

    fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
