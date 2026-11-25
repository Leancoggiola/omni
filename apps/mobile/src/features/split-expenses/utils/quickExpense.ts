import { AMOUNT_MAX_12_2 } from '@omni/shared/common';
import { GATHERING_EXPENSE_DESCRIPTION_MAX } from '@omni/shared/split-expenses';

export const QUICK_EXPENSE_HINT = 'Empezá con el monto: por ejemplo, 27000 Bebidas';

const GROUPED_WITH_DECIMALS = /^(\d{1,3}(\.\d{3})+|\d+),\d{1,2}$/;
const GROUPED = /^\d{1,3}(\.\d{3})+$/;
const PLAIN = /^\d+(\.\d{1,2})?$/;
const LEADING_AMOUNT = /^\$?\s*(\d[\d.,]*)(?:\s+([\s\S]*))?$/;

export interface QuickExpense {
  amount: number;
  description: string | null;
}

/**
 * Importe escrito por la persona, en formato es-AR (`27.000,50`) o con punto decimal (`27000.50`, lo que da el teclado
 * numérico de algunos teléfonos). Acepta un `$` adelante. `null` si no es un importe positivo que la API admita.
 */
export function parseAmountInput(text: string): number | null {
  const token = text.trim().replace(/^\$\s*/, '');
  let normalized: string;
  if (GROUPED_WITH_DECIMALS.test(token)) normalized = token.replace(/\./g, '').replace(',', '.');
  else if (GROUPED.test(token)) normalized = token.replace(/\./g, '');
  else if (PLAIN.test(token)) normalized = token;
  else return null;
  const amount = Number(normalized);
  return amount > 0 && amount <= AMOUNT_MAX_12_2 ? amount : null;
}

/**
 * Separa lo escrito en la carga rápida en el monto del principio y el detalle que sigue, sin validar el monto: sirve
 * para precargar la hoja completa. Sin un número adelante, todo es detalle.
 */
export function splitQuickInput(text: string): { amount: string; description: string } {
  const trimmed = text.trim();
  const match = trimmed.match(LEADING_AMOUNT);
  if (!match) return { amount: '', description: trimmed };
  return { amount: match[1] ?? '', description: (match[2] ?? '').trim() };
}

/**
 * Gasto de la carga rápida (`"27000 Bebidas"`): el número inicial es el monto y el resto el detalle, recortado al
 * largo que admite la API. `null` si no empieza con un importe válido.
 */
export function parseQuickExpense(text: string): QuickExpense | null {
  const parts = splitQuickInput(text);
  const amount = parseAmountInput(parts.amount);
  if (amount === null) return null;
  const description = parts.description.slice(0, GATHERING_EXPENSE_DESCRIPTION_MAX);
  return { amount, description: description === '' ? null : description };
}
