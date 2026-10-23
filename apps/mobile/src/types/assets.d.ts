/** Imágenes estáticas que resuelve Metro: `import logo from '…/logo.png'` da el source para `<Image>`. */
declare module '*.png' {
  const source: import('react-native').ImageSourcePropType;
  export default source;
}
