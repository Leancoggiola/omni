import { formatVariantShort } from './gymFormat';

import type { GymWeightEntry } from '@omni/shared/gym';

/**
 * Aclaración de cada entrada del historial (del más nuevo al más viejo): si tiene el mismo peso que la siguiente más
 * vieja ya cargada pero otro esquema de series y repeticiones, dice con cuál era antes. Sin la más vieja cargada
 * (está en otra página) no hay aclaración.
 */
export function schemeChangeNotes(entries: GymWeightEntry[]): Map<string, string> {
  const notes = new Map<string, string>();
  entries.forEach((entry, index) => {
    const older = entries[index + 1];
    if (!older || older.weightKg !== entry.weightKg) return;
    if (older.sets === entry.sets && older.reps === entry.reps) return;
    notes.set(entry.id, `Cambiaron las series o repeticiones (antes ${formatVariantShort(older.sets, older.reps)})`);
  });
  return notes;
}
