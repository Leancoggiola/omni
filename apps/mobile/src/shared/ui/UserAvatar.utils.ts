/**
 * Iniciales como las arma `Avatar name` de Mantine (`getInitials`): primera letra de las dos primeras
 * palabras, o las dos primeras letras si hay una sola ("Admin" → "AD"). A diferencia de Mantine, se
 * ignoran los espacios de más.
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join('').toUpperCase();
  return words
    .slice(0, 2)
    .map(word => Array.from(word)[0])
    .join('')
    .toUpperCase();
}
