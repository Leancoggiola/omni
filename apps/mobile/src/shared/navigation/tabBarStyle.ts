/** Alto del contenido de la tab bar: pill del ícono (30) + etiqueta + aire, sin el inset de la barra del sistema. */
export const TAB_BAR_CONTENT_HEIGHT = 64;

/**
 * `BottomTabBar` suma `insets.bottom` como padding pero, con la altura por defecto (49), el contenido de las
 * tabs ocupa más y se mete en la zona del inset, donde la barra de navegación de Android lo tapa. Con la altura
 * explícita el contenido conserva `TAB_BAR_CONTENT_HEIGHT` y el inset queda aparte, debajo.
 */
export function getTabBarStyle(insetBottom: number) {
  return { height: TAB_BAR_CONTENT_HEIGHT + insetBottom };
}
