import { render, screen } from '@testing-library/react-native';
import { WarningCircleIcon } from 'phosphor-react-native';
import { AccessibilityInfo } from 'react-native';

import { Badge } from './Badge';
import { Banner } from './Banner';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

describe('Badge', () => {
  it('filled accent: texto de autoContrast sobre terracota, en mayúsculas y 700 (tipo de media)', () => {
    render(
      <Badge color="accent" variant="filled">
        Serie
      </Badge>
    );
    const text = screen.getByText('Serie');
    expect(text).toHaveProp('color', '$onAccentFill');
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

  it('con ícono sigue siendo una alerta con el mensaje', () => {
    render(
      <Banner color="info" icon={WarningCircleIcon}>
        Modo de prueba
      </Banner>
    );

    expect(screen.getByRole('alert', { name: 'Modo de prueba' })).toBeTruthy();
    expect(screen.getByText('Modo de prueba')).toHaveProp('color', '$info');
  });
});
