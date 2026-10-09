import { render, screen } from '@testing-library/react-native';
import { WarningCircleIcon } from 'phosphor-react-native';
import { AccessibilityInfo } from 'react-native';

import { Badge } from './Badge';
import { Banner } from './Banner';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

describe('Badge', () => {
  it('filled accent: blanco sobre terracota, en mayúsculas y 700 (tipo de media)', () => {
    render(
      <Badge color="accent" variant="filled">
        Serie
      </Badge>
    );
    const text = screen.getByText('Serie');
    expect(text).toHaveProp('color', '$onDestructive');
    expect(text).toHaveProp('textTransform', 'uppercase');
    expect(text).toHaveProp('fontWeight', '700');
  });

  it('light dimmed: texto atenuado ("Próximamente")', () => {
    render(<Badge color="dimmed">Próximamente</Badge>);
    expect(screen.getByText('Próximamente')).toHaveProp('color', '$dimmed');
  });
});

describe('Banner', () => {
  it('se anuncia como alerta, al aparecer, y muestra el mensaje en el color', () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    render(<Banner color="destructive">Usuario o contraseña incorrectos</Banner>);

    expect(screen.getByRole('alert', { name: 'Usuario o contraseña incorrectos' })).toBeTruthy();
    expect(screen.getByText('Usuario o contraseña incorrectos')).toHaveProp('color', '$destructive');
    expect(announce).toHaveBeenCalledWith('Usuario o contraseña incorrectos');
  });

  it('con título: título en el color, mensaje en el texto normal y se leen juntos', () => {
    render(
      <Banner color="warning" title="Atención" icon={WarningCircleIcon}>
        Revisá los datos
      </Banner>
    );

    expect(screen.getByText('Atención')).toHaveProp('color', '$warning');
    expect(screen.getByText('Revisá los datos')).toHaveProp('color', '$color');
    expect(screen.getByRole('alert', { name: 'Atención. Revisá los datos' })).toBeTruthy();
  });
});
