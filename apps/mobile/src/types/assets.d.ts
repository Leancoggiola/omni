/** Metro resuelve las fuentes como assets: el import devuelve el id numérico que espera `useFonts`. */
declare module '*.otf' {
  const asset: number;
  export default asset;
}
