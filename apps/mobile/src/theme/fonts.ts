import { Montserrat_400Regular } from '@expo-google-fonts/montserrat/400Regular';
import { Montserrat_500Medium } from '@expo-google-fonts/montserrat/500Medium';
import { Montserrat_600SemiBold } from '@expo-google-fonts/montserrat/600SemiBold';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat/700Bold';

/**
 * Caras de Montserrat (la misma fuente que web) para `useFonts`. Los nombres tienen que coincidir
 * con el `face` de las fuentes en `tamagui.config.ts`. Vive aparte porque el compilador de Tamagui
 * carga esa config en Node, donde importar un `.ttf` falla.
 */
export const MONTSERRAT_FACES = {
  Montserrat: Montserrat_400Regular,
  MontserratMedium: Montserrat_500Medium,
  MontserratSemiBold: Montserrat_600SemiBold,
  MontserratBold: Montserrat_700Bold,
};
