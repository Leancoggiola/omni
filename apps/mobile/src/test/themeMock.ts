/**
 * Doble de `@/core/theme` para tests de `@/shared/ui`: colores del esquema claro sin montar
 * `ColorSchemeProvider` (que depende de auth). Se carga con
 * `jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'))`.
 */
import { SEMANTIC } from '@omni/shared/theme';

export const useSemanticColors = () => SEMANTIC.light;
