import { render, screen } from '@testing-library/react-native';
// eslint-disable-next-line no-restricted-imports
import { Paragraph as TamaguiParagraph, TamaguiProvider } from 'tamagui';

import { tamaguiConfig } from '@/theme/tamagui.config';

import { Paragraph } from './Paragraph';

async function renderLight(children: React.ReactNode) {
  return await render(
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      {children}
    </TamaguiProvider>
  );
}

describe('Paragraph (render real de Tamagui)', () => {
  it('el Text nativo no es seleccionable, a diferencia del de Tamagui (#328)', async () => {
    await renderLight(
      <>
        <TamaguiParagraph testID="tamagui">Volver a escanear</TamaguiParagraph>
        <Paragraph testID="app">Volver a escanear</Paragraph>
      </>
    );

    expect(screen.getByTestId('tamagui').props.selectable).toBe(true);
    expect(screen.getByTestId('app').props.selectable).toBe(false);
  });

  it('`userSelect="text"` lo vuelve seleccionable', async () => {
    await renderLight(
      <Paragraph testID="app" userSelect="text">
        ABCD-1234
      </Paragraph>
    );

    expect(screen.getByTestId('app').props.selectable).toBe(true);
  });
});
