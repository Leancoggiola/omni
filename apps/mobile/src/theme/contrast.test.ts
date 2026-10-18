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

/**
 * Compone un color `#RRGGBBAA` sobre un fondo opaco: los washes de oscuro son translúcidos y
 * `contrastRatio` ignora el alfa, así que el contraste se mide contra lo que se ve.
 */
function over(color: string, background: string): string {
  const alpha = color.length === 9 ? parseInt(color.slice(7, 9), 16) / 255 : 1;
  const mix = (i: number) =>
    Math.round(parseInt(color.slice(i, i + 2), 16) * alpha + parseInt(background.slice(i, i + 2), 16) * (1 - alpha))
      .toString(16)
      .padStart(2, '0');
  return `#${mix(1)}${mix(3)}${mix(5)}`;
}

/**
 * Regresión de contraste de texto (#137): el texto por defecto, el de marca y el atenuado llegan a AA
 * sobre el canvas y la card, y el de marca también sobre su wash (chip marcado, Badge y Banner brand,
 * Button light, ítem activo de la tab bar).
 */
describe.each(['light', 'dark'] as const)('contraste de texto de SEMANTIC (%s)', scheme => {
  const s = SEMANTIC[scheme];

  it.each([
    ['texto sobre canvas', s.text, s.body],
    ['texto sobre card', s.text, s.card],
    ['marca sobre canvas', s.primary, s.body],
    ['marca sobre card', s.primary, s.card],
    ['marca sobre su wash en una card', s.primary, over(s.primarySurface, s.card)],
    ['marca sobre su wash en el canvas', s.primary, over(s.primarySurface, s.body)],
    ['atenuado sobre canvas', s.dimmed, s.body],
    ['atenuado sobre card', s.dimmed, s.card],
    ['link sobre canvas', s.anchor, s.body],
  ])('%s llega a AA', (_name, text, background) => {
    expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });
});

describe('contrastRatio', () => {
  it('da 21 entre blanco y negro, y 1 entre un color y sí mismo', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#BD7C57', '#BD7C57')).toBe(1);
  });
});
