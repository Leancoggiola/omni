/** Fecha de alta de la API (ISO) → `dd/mm/aaaa` a partir del día que trae el string; vacío si no se puede leer. */
export function formatCreatedAt(createdAt: string): string {
  const match = createdAt.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}
