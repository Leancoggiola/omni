import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { SectionCard } from './SectionCard';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

describe('SectionCard', () => {
  it('es una card glass de radio 24 con borde glass y la sombra card', () => {
    render(
      <SectionCard>
        <Text>contenido</Text>
      </SectionCard>
    );

    const card = screen.UNSAFE_getByProps({ backgroundColor: '$surfaceGlass' });
    expect(card.props).toMatchObject({ borderColor: '$glassBorder', borderRadius: 24, shadowRadius: 32 });
  });

  it('con título y subtítulo los muestra arriba del contenido', () => {
    render(
      <SectionCard title="Preferencias" subtitle="Cómo ves Omni">
        <Text>contenido</Text>
      </SectionCard>
    );

    expect(screen.getByText('Preferencias')).toBeTruthy();
    expect(screen.getByText('Cómo ves Omni')).toBeTruthy();
    expect(screen.getByText('contenido')).toBeTruthy();
  });

  it('compact es la card de una sola fila: 4 de alto y 16 a los lados', () => {
    render(
      <SectionCard compact>
        <Text>fila</Text>
      </SectionCard>
    );

    const card = screen.UNSAFE_getByProps({ backgroundColor: '$surfaceGlass' });
    expect(card.props).toMatchObject({ paddingHorizontal: 16, paddingVertical: 4 });
  });
});
