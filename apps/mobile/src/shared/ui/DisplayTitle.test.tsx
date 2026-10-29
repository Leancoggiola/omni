import { render, screen } from '@testing-library/react-native';

import { DisplayTitle } from './DisplayTitle';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));

describe('DisplayTitle', () => {
  it('es un encabezado en la familia display con el estilo de su tamaño', () => {
    render(<DisplayTitle size="lg">Mi Perfil</DisplayTitle>);

    const title = screen.getByRole('header', { name: 'Mi Perfil' });
    expect(title).toHaveProp('fontFamily', '$display');
    expect(title).toHaveProp('fontSize', 32);
    expect(title).toHaveProp('fontWeight', '800');
    expect(title).toHaveProp('textTransform', 'none');
  });

  it('el tamaño md usa el peso 700', () => {
    render(<DisplayTitle size="md">Ingresá a tu cuenta</DisplayTitle>);

    expect(screen.getByRole('header')).toHaveProp('fontWeight', '700');
  });

  it('pinta solo la palabra acentuada en primary y conserva el resto del texto', () => {
    render(<DisplayTitle accent="Series">Películas y Series</DisplayTitle>);

    expect(screen.getByText('Series')).toHaveProp('color', '$primary');
    expect(screen.getByText('Series')).toHaveProp('letterSpacing', 0);
    expect(screen.getByRole('header', { name: 'Películas y Series' })).toHaveProp('color', '$color');
  });

  it('si el acento no aparece en el texto queda sin acentuar', () => {
    render(<DisplayTitle accent="Omni">Mi Perfil</DisplayTitle>);

    expect(screen.queryByText('Omni')).toBeNull();
    expect(screen.getByText('Mi Perfil')).toBeTruthy();
  });

  it('con header={false} no es un encabezado (mensajes de estados)', () => {
    render(
      <DisplayTitle size="md" header={false}>
        Algo salió mal
      </DisplayTitle>
    );

    expect(screen.queryByRole('header')).toBeNull();
    expect(screen.getByText('Algo salió mal')).toBeTruthy();
  });

  it('el acento es la última aparición del texto (como PageHeader de web)', () => {
    render(<DisplayTitle accent="Serie">Serie y Serie</DisplayTitle>);

    expect(screen.getAllByText('Serie')).toHaveLength(1);
    expect(screen.getByRole('header', { name: 'Serie y Serie' })).toBeTruthy();
  });
});
