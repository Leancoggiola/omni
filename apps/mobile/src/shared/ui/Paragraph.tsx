import { Paragraph as TamaguiParagraph, styled } from 'tamagui';

/**
 * `Paragraph` de la app: el de Tamagui con `userSelect="none"` (`selectable={false}` en el `Text` nativo). El de
 * Tamagui nace seleccionable y, en Android, un `Text` seleccionable se dibuja más angosto de lo que se midió: en un
 * contenedor que abraza el contenido la línea se parte y, con `numberOfLines`, se pierden palabras sin "…" (#328).
 * Si un texto se tiene que poder seleccionar, lleva `userSelect="text"` y un ancho que no salga de su contenido.
 * ESLint prohíbe importar el de `tamagui`.
 */
export const Paragraph = styled(TamaguiParagraph, { userSelect: 'none' });
