/**
 * Resultado de enviar un formulario del gimnasio en una hoja: `done` (se guardó), `closed` (no se guardó: el plan o
 * el elemento ya no admiten el cambio y la pantalla cierra la hoja) o `error` (la hoja queda abierta con el mensaje
 * en un `Banner`; `conflict` es un 409 de formulario, con una línea de ayuda del cliente debajo).
 */
export type GymSubmitResult =
  | { status: 'done' }
  | { status: 'closed' }
  | { status: 'error'; message: string; conflict: boolean };
