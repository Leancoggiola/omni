/** Error de una respuesta no OK de la API: `message` sale del body (ya en español) y `info` es el body completo. */
export class ApiError extends Error {
  status: number;
  info: unknown;

  constructor(message: string, status: number, info?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.info = info;
  }
}
