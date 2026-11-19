import { describe, expect, it } from 'vitest';

import { contrastRatio, SEMANTIC, semanticDark, semanticLight, WCAG_AA_TEXT } from '..';

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
    ['Button success filled y barra completada', s.successFill, s.onSuccessFill],
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
    ['placeholder sobre card (input)', s.placeholder, s.card],
    ['texto sobre card glass en el canvas', s.text, over(s.surfaceGlass, s.body)],
    ['atenuado sobre card glass en el canvas', s.dimmed, over(s.surfaceGlass, s.body)],
    ['marca sobre card glass en el canvas', s.primary, over(s.surfaceGlass, s.body)],
    ['texto sobre la mancha durazno', s.text, s.glowPeach],
    ['texto sobre la mancha lila', s.text, s.glowLilac],
  ])('%s llega a AA', (_name, text, background) => {
    expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });
});

/**
 * Regresión de contraste del texto semántico: el rojo, el naranja y el azul de estado llegan a AA sobre
 * canvas, card y su wash (Banner, Badge y Alert de error, warning e info). En claro el texto subió a
 * `RED[9]`, `ORANGE[9]` y `BLUE[8]` porque los tonos anteriores daban 3,84, 4,18 y 4,12:1 sobre su wash.
 * Los íconos y bordes de warning e info comparten el tono del texto, y como elementos gráficos piden 3:1.
 */
describe.each(['light', 'dark'] as const)('contraste del texto de estado de SEMANTIC (%s)', scheme => {
  const s = SEMANTIC[scheme];

  it.each([
    ['destructivo sobre canvas', s.destructive, s.body],
    ['destructivo sobre card', s.destructive, s.card],
    ['destructivo sobre su wash en una card', s.destructive, over(s.errorSurface, s.card)],
    ['destructivo sobre su wash en el canvas', s.destructive, over(s.errorSurface, s.body)],
    ['warning sobre canvas', s.warning, s.body],
    ['warning sobre card', s.warning, s.card],
    ['warning sobre su wash en una card', s.warning, over(s.warningSurface, s.card)],
    ['warning sobre su wash en el canvas', s.warning, over(s.warningSurface, s.body)],
    ['info sobre canvas', s.info, s.body],
    ['info sobre card', s.info, s.card],
    ['info sobre su wash en una card', s.info, over(s.infoSurface, s.card)],
    ['info sobre su wash en el canvas', s.info, over(s.infoSurface, s.body)],
  ])('%s llega a AA', (_name, text, background) => {
    expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });

  it.each([
    ['ícono de error sobre su wash', s.errorIcon, over(s.errorSurface, s.card)],
    ['ícono de warning sobre su wash', s.warningIcon, over(s.warningSurface, s.card)],
    ['ícono de info sobre su wash', s.infoIcon, over(s.infoSurface, s.card)],
    ['borde de warning sobre su wash', s.warningBorder, over(s.warningSurface, s.card)],
    ['borde de info sobre su wash', s.infoBorder, over(s.infoSurface, s.card)],
  ])('%s llega a 3:1', (_name, color, background) => {
    expect(contrastRatio(color, background)).toBeGreaterThanOrEqual(3);
  });
});

/** El texto de estado en claro es el del Design System: `#B41E25`, `#C3400D` y `#1665AE`. */
describe('texto de estado en claro', () => {
  it('destructive, warning e info usan los tonos AA del Design System', () => {
    expect(SEMANTIC.light.destructive).toBe('#B41E25');
    expect(SEMANTIC.light.warning).toBe('#C3400D');
    expect(SEMANTIC.light.info).toBe('#1665AE');
  });

  it('el relleno destructivo sigue en RED[7]: el blanco encima ya cumple AA', () => {
    expect(SEMANTIC.light.destructiveFill).toBe('#D83737');
  });
});

/**
 * Los hovers del atenuado y del link (#137) también llegan a AA sobre el canvas y la card. No están en
 * `SEMANTIC` (mobile no tiene hover), así que se leen de `semanticLight` / `semanticDark`; el link hover
 * solo existe en claro.
 */
describe('contraste de los hovers de texto', () => {
  const light = SEMANTIC.light;
  const dark = SEMANTIC.dark;

  it.each([
    ['atenuado hover sobre canvas (claro)', semanticLight['--mantine-color-text-dimmed-hover'], light.body],
    ['atenuado hover sobre card (claro)', semanticLight['--mantine-color-text-dimmed-hover'], light.card],
    ['link hover sobre canvas (claro)', semanticLight['--mantine-color-text-link-hover'], light.body],
    ['link hover sobre card (claro)', semanticLight['--mantine-color-text-link-hover'], light.card],
    ['atenuado hover sobre canvas (oscuro)', semanticDark['--mantine-color-text-dimmed-hover'], dark.body],
    ['atenuado hover sobre card (oscuro)', semanticDark['--mantine-color-text-dimmed-hover'], dark.card],
  ])('%s llega a AA', (_name, text, background) => {
    expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });
});

/**
 * El `on-success-fill` del Design System v2 da 5,1:1 en los dos esquemas (el piso de AA es 4,5:1, pero el
 * diseño pide 5,1: si baja, el relleno saldado se tocó sin querer).
 */
describe.each(['light', 'dark'] as const)('success-fill de v2 (%s)', scheme => {
  it('su texto da al menos 5:1', () => {
    const s = SEMANTIC[scheme];
    expect(contrastRatio(s.successFill, s.onSuccessFill)).toBeGreaterThanOrEqual(5);
  });
});

describe('contrastRatio', () => {
  it('da 21 entre blanco y negro, y 1 entre un color y sí mismo', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#BD7C57', '#BD7C57')).toBe(1);
  });
});
