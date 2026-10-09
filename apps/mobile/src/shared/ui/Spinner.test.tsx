import { render, screen } from '@testing-library/react-native';

import { Spinner } from './Spinner';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));

describe('Spinner', () => {
  it('va en el color de marca por defecto y se anuncia como progreso', () => {
    render(<Spinner />);
    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toHaveProp('color', '$primary');
  });

  it('acepta otro color (dentro de un botón filled)', () => {
    render(<Spinner color="$color" />);
    expect(screen.getByRole('progressbar')).toHaveProp('color', '$color');
  });
});
