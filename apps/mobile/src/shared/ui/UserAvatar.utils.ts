/** Iniciales como las arma `Avatar name` de Mantine: primera letra de las dos primeras palabras. */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
}
