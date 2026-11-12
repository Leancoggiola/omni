/**
 * Descarta un error a propósito. Sirve como `promise.catch(ignoreError)` y como cuerpo de un `catch` best-effort,
 * así la intención queda explícita en vez de un bloque o un callback vacío.
 */
export function ignoreError(): void {}
