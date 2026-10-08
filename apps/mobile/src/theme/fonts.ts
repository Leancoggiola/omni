import InterBold from '@tamagui/font-inter/otf/Inter-Bold.otf';
import InterMedium from '@tamagui/font-inter/otf/Inter-Medium.otf';
import Inter from '@tamagui/font-inter/otf/Inter-Regular.otf';
import InterSemiBold from '@tamagui/font-inter/otf/Inter-SemiBold.otf';

/**
 * Caras de Inter para `useFonts`. Los nombres tienen que coincidir con el `face` de las fuentes en
 * `tamagui.config.ts`. Vive aparte porque el compilador de Tamagui carga esa config en Node, donde
 * importar un `.otf` falla.
 */
export const INTER_FACES = { Inter, InterMedium, InterSemiBold, InterBold };
