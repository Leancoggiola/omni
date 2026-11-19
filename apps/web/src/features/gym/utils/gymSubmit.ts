/**
 * Resultado de enviar un formulario del gimnasio: `done` (se guardó), `closed` (no se guardó: el plan o el
 * elemento ya no admiten el cambio y la pantalla cierra el modal), `conflict` (409 que se muestra como aviso dentro
 * del formulario, que queda abierto) o `failed` (red o error inesperado: ya se avisó con un toast y el formulario
 * queda abierto con lo cargado).
 */
export type GymSubmitResult =
  | { status: 'done' }
  | { status: 'closed' }
  | { status: 'conflict'; message: string }
  | { status: 'failed' };
