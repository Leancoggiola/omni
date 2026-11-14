/**
 * Copia la respuesta de `useSWR` leyendo todos sus campos durante el render. SWR solo vuelve a renderizar por los
 * campos que se leyeron al renderizar, y un test con `renderHook` los lee después (`result.current.data`): sin esto,
 * con RNTL 14 el hook nunca se actualiza en el test.
 */
export function trackSWR<T extends object>(response: T): T {
  return { ...response };
}
