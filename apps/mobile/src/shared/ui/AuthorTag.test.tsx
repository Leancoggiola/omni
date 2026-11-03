import { render, screen } from '@testing-library/react-native';

import { AuthorTag } from './AuthorTag';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));

describe('AuthorTag', () => {
  it('muestra iniciales y nombre del otro integrante', () => {
    render(<AuthorTag author={{ kind: 'member', name: 'Lucía Fernández', avatarUrl: null }} />);

    expect(screen.getByLabelText('Agregado por Lucía Fernández')).toBeTruthy();
    expect(screen.getByText('LF')).toBeTruthy();
  });

  it('dice "Vos" para la propia sesión', () => {
    render(<AuthorTag author={{ kind: 'self', name: 'Leandro Coggiola', avatarUrl: null }} />);

    expect(screen.getByLabelText('Agregado por Vos')).toBeTruthy();
    expect(screen.getByText('Vos')).toBeTruthy();
  });

  it('la cuenta eliminada es un avatar neutro con "?"', () => {
    render(<AuthorTag author={{ kind: 'deleted', name: 'Cuenta eliminada', avatarUrl: null }} />);

    expect(screen.getByText('?')).toBeTruthy();
    expect(screen.getByText('Cuenta eliminada')).toBeTruthy();
  });

  it('sin nombre queda solo el avatar con su label accesible', () => {
    render(<AuthorTag author={{ kind: 'member', name: 'Lucía Fernández', avatarUrl: null }} showName={false} />);

    expect(screen.getByLabelText('Agregado por Lucía Fernández')).toBeTruthy();
    expect(screen.queryByText('Lucía Fernández')).toBeNull();
  });
});
