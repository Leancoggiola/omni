/** Copia de `items` con el de `index` movido un lugar (`-1` arriba, `1` abajo); fuera de rango queda igual. */
export function moveItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  const next = [...items];
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return next;
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}
