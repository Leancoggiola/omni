/**
 * Error de dominio con el status HTTP que `errorHandler` responde tal cual. A diferencia de lanzar un literal,
 * conserva el stack y entra en `instanceof Error`.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
