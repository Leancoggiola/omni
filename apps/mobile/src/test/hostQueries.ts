import { screen } from '@testing-library/react-native';

import type { TestInstance } from 'test-renderer';

/**
 * Nodos host del árbol renderizado cuyas props incluyen todas las de `props` (igualdad estricta). Test Renderer solo
 * ve host components, así que las props que un doble de Tamagui pasa al `View` (`backgroundColor`, `paddingTop`) se
 * leen acá en vez de buscar el componente por tipo.
 */
export function queryAllByHostProps(props: Record<string, unknown>): TestInstance[] {
  const entries = Object.entries(props);
  return screen.container.queryAll(node => entries.every(([key, value]) => node.props[key] === value));
}

/** El único nodo host con esas props; falla si no hay ninguno o hay más de uno. */
export function getByHostProps(props: Record<string, unknown>): TestInstance {
  const matches = queryAllByHostProps(props);
  if (matches.length !== 1) {
    throw new Error(`Se esperaba un nodo host con ${JSON.stringify(props)} y hay ${matches.length}`);
  }
  return matches[0]!;
}

/** Nodos host de un tipo (`Modal`, `RNSVGRadialGradient`, `RCTScrollView`). */
export function queryAllByHostType(type: string): TestInstance[] {
  return screen.container.queryAll(node => node.type === type);
}

/** El único nodo host de ese tipo; falla si no hay ninguno o hay más de uno. */
export function getByHostType(type: string): TestInstance {
  const matches = queryAllByHostType(type);
  if (matches.length !== 1) {
    throw new Error(`Se esperaba un nodo host ${type} y hay ${matches.length}`);
  }
  return matches[0]!;
}
