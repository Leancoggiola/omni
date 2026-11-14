import { fireEvent, render, screen } from '@testing-library/react-native';
import { FilmSlateIcon } from 'phosphor-react-native';
import { Text } from 'react-native';

import { queryAllByHostProps } from '@/test/hostQueries';

import { ScreenHeader } from './ScreenHeader';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

describe('ScreenHeader', () => {
  it('muestra el título en display con la última palabra en primary y el subtítulo', async () => {
    await render(<ScreenHeader icon={FilmSlateIcon} title="Películas y Series" subtitle="Tu lista de seguimiento" />);

    expect(screen.getByRole('header', { name: 'Películas y Series' })).toHaveProp('fontFamily', 'display');
    expect(screen.getByText('Series')).toHaveProp('color', 'primary');
    expect(screen.getByText('Tu lista de seguimiento')).toBeTruthy();
  });

  it('`accent` elige otra palabra entera del título', async () => {
    await render(<ScreenHeader icon={FilmSlateIcon} title="Mi Perfil de usuario" accent="Perfil" />);

    expect(screen.getByText('Perfil')).toHaveProp('color', 'primary');
    expect(screen.queryByText('usuario')).toBeNull();
  });

  it('un título de una sola palabra, o un acento que no es una palabra suya, no se resalta', async () => {
    const { rerender } = await render(<ScreenHeader icon={FilmSlateIcon} title="Más" />);
    expect(screen.queryByText('Más', { exact: true })).toBeTruthy();
    expect(queryAllByHostProps({ color: 'primary' })).toHaveLength(0);

    await rerender(<ScreenHeader icon={FilmSlateIcon} title="Mi Perfil" accent="Per" />);
    expect(queryAllByHostProps({ color: 'primary' })).toHaveLength(0);
  });

  it('con onBack suma el botón de volver', async () => {
    const onBack = jest.fn();
    await render(<ScreenHeader icon={FilmSlateIcon} title="Mi Perfil" onBack={onBack} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('sin ícono no dibuja el chip, y `size` elige el tamaño del título', async () => {
    await render(<ScreenHeader title="Mi Perfil" size="lg" />);

    expect(queryAllByHostProps({ backgroundColor: 'primarySurface' })).toHaveLength(0);
    expect(screen.getByRole('header', { name: 'Mi Perfil' })).toHaveProp('fontSize', 32);
  });

  it('el volver es un botón glass con el nombre que se le pasa', async () => {
    await render(<ScreenHeader title="Mi Perfil" onBack={() => undefined} backLabel="Volver a Más" />);

    expect(screen.getByRole('button', { name: 'Volver a Más' })).toHaveProp('backgroundColor', 'surfaceGlass');
  });

  it('con action dibuja el control a la derecha del título', async () => {
    await render(<ScreenHeader title="Películas y Series" action={<Text>Control</Text>} />);

    expect(screen.getByText('Control')).toBeTruthy();
  });
});
