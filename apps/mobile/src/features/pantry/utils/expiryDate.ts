/** Pasa lo que escribe el usuario a `dd/mm/aaaa`: solo dígitos (hasta 8) con las barras puestas solas. */
export function maskExpiryInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** `2026-11-20` → `20/11/2026`; sin fecha, vacío. */
export function expiryToDisplay(expiresAt: string | null): string {
  const match = expiresAt?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

/** `dd/mm/aaaa` → `YYYY-MM-DD`: `null` si está vacío (sin vencimiento) y `undefined` si no es un día real. */
export function parseExpiryInput(display: string): string | null | undefined {
  const text = display.trim();
  if (text === '') return null;
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isRealDate && year >= 2000 ? `${match[3]}-${match[2]}-${match[1]}` : undefined;
}
