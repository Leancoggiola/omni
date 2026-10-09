import { contrastRatio, SEMANTIC, WCAG_AA_TEXT } from '@omni/shared/theme';

/**
 * Regresión de contraste: cada relleno con texto encima (Button y Badge filled, segmento activo)
 * llega a AA en los dos esquemas. Si un token cambia y baja de 4,5:1, falla acá y no en la pantalla.
 */
describe.each(['light', 'dark'] as const)('contraste de rellenos de SEMANTIC (%s)', scheme => {
  const s = SEMANTIC[scheme];

  it.each([
    ['Button filled de marca', s.primaryFill, s.onPrimaryFill],
    ['Button filled de marca (hover)', s.primaryFillHover, s.onPrimaryFill],
    ['Button filled de marca (presionado) y FAB', s.primaryFillPress, s.onPrimaryFill],
    ['segmento activo y Badge brand', s.primary, s.onPrimary],
    ['Badge terracota (tipo de media)', s.accentFill, s.onAccentFill],
    ['Button y Badge destructivo', s.destructiveFill, s.onDestructive],
    ['Badge success', s.success, s.onSuccess],
    ['Badge dimmed', s.dimmed, s.onDimmed],
  ])('%s llega a AA', (_name, fill, text) => {
    expect(contrastRatio(fill, text)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });
});

describe('contrastRatio', () => {
  it('da 21 entre blanco y negro, y 1 entre un color y sí mismo', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#BD7C57', '#BD7C57')).toBe(1);
  });
});
