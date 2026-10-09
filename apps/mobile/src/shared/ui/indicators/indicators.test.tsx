import { SEMANTIC } from '@omni/shared/theme';
import { render, screen } from '@testing-library/react-native';
import { WarningCircleIcon } from 'phosphor-react-native';

import { Spinner } from '../Spinner';

import { Badge } from './Badge';
import { Banner } from './Banner';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

const s = SEMANTIC.light;

describe('Badge', () => {
  it('filled accent: texto blanco sobre terracota, en mayúsculas y 700 (tipo de media)', () => {
    render(
      <Badge color="accent" variant="filled">
        Serie
      </Badge>
    );
    const text = screen.getByText('Serie');
    expect(text).toHaveProp('color', s.white);
    expect(text).toHaveProp('textTransform', 'uppercase');
    expect(text).toHaveProp('fontWeight', '700');
  });

  it('light dimmed: texto atenuado ("Próximamente")', () => {
    render(<Badge color="dimmed">Próximamente</Badge>);
    expect(screen.getByText('Próximamente')).toHaveProp('color', s.dimmed);
  });
});

describe('Banner', () => {
  it('se anuncia como alerta y muestra el mensaje en el color', () => {
    render(<Banner color="destructive">Usuario o contraseña incorrectos</Banner>);

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Usuario o contraseña incorrectos')).toHaveProp('color', s.destructive);
  });

  it('con título: título en el color y mensaje en el texto normal', () => {
    render(
      <Banner color="warning" title="Atención" icon={WarningCircleIcon}>
        Revisá los datos
      </Banner>
    );

    expect(screen.getByText('Atención')).toHaveProp('color', s.warning);
    expect(screen.getByText('Revisá los datos')).toHaveProp('color', '$color');
  });
});

describe('Spinner', () => {
  it('va en el color de marca por defecto y se anuncia como progreso', () => {
    render(<Spinner />);
    const spinner = screen.getByRole('progressbar', { name: 'Cargando' });
    expect(spinner).toHaveProp('color', '$primary');
  });

  it('acepta otro color (dentro de un botón filled)', () => {
    render(<Spinner color="$color" />);
    expect(screen.getByRole('progressbar')).toHaveProp('color', '$color');
  });
});
