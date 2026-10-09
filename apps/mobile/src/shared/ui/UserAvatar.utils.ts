/**
 * Iniciales como las arma `Avatar name` de Mantine (`getInitials`): primera letra de las dos primeras
 * palabras, o las dos primeras letras si hay una sola ("Admin" → "AD"). A diferencia de Mantine, se
 * ignoran los espacios de más.
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, 2)
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase();
}
