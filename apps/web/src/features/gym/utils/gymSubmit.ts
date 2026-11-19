/**
 * Resultado de enviar un formulario del gimnasio: `done` (se guardó o el modal ya no tiene sentido, la pantalla lo
 * cierra), `conflict` (409 que se muestra como aviso dentro del formulario, que queda abierto) o `failed` (red o error
 * inesperado: ya se avisó con un toast y el formulario queda abierto con lo cargado).
 */
export type GymSubmitResult = { status: 'done' } | { status: 'conflict'; message: string } | { status: 'failed' };
