import { Sheet, styled } from 'tamagui';

/**
 * Scrim de los sheets: el `scrim` del theme (el mismo `surfaces-overlay` de web) a opacidad plena, con fundido al
 * entrar y salir. El `Sheet.Overlay` de Tamagui 3 trae `shadow-color` a 0.45, que sobre el fondo oscuro casi no se ve.
 * Es un `styled` y no un componente que lo envuelve: `Sheet` reconoce el overlay entre sus hijos por su `staticConfig`.
 */
export const SheetOverlay = styled(Sheet.Overlay, {
  transition: 'lazy',
  backgroundColor: 'scrim',
  opacity: '1 enter:0 exit:0',
});
