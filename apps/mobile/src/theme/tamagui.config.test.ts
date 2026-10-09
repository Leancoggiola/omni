import { SEMANTIC } from '@omni/shared/theme';

import { tamaguiConfig } from './tamagui.config';

const themes = tamaguiConfig.themes as unknown as Record<string, Record<string, unknown>>;

/** Los themes del config pueden guardar la variable de Tamagui (`{ val }`) en vez del string. */
function value(theme: string, key: string): unknown {
  const v = themes[theme]?.[key];
  return v && typeof v === 'object' && 'val' in v ? (v as { val: unknown }).val : v;
}

describe.each(['light', 'dark'] as const)('sub-themes de componentes (%s)', scheme => {
  const s = SEMANTIC[scheme];

  it.each([
    ['Button', 'background', s.card],
    ['active_Button', 'background', s.primary],
    ['active_Button', 'color', s.onPrimary],
    ['red_Button', 'background', s.destructive],
    ['red_Button', 'color', s.onDestructive],
    ['Switch', 'background', s.border],
    ['active_Switch', 'background', s.primary],
    ['Switch', 'backgroundActive', s.primary],
    ['SwitchThumb', 'background', s.white],
    ['active_SwitchThumb', 'background', s.white],
    ['SliderTrackActive', 'background', s.primary],
    ['ProgressIndicator', 'background', s.primary],
    ['Card', 'background', s.card],
    ['ListItem', 'color', s.text],
    ['Checkbox', 'borderColor', s.border],
    ['RadioGroupItem', 'borderColor', s.border],
    ['SliderTrack', 'background', s.border],
    ['SliderThumb', 'background', s.primary],
    ['TooltipArrow', 'borderColor', s.border],
    ['DrawerFrame', 'background', s.body],
    ['Progress', 'background', s.border],
    ['TooltipContent', 'background', s.card],
    ['red_Switch', 'background', s.destructive],
    ['blue_Button', 'background', s.card],
    ['Button', 'primary', s.primary],
    ['active_Button', 'dimmed', s.dimmed],
  ])('%s: %s resuelve a SEMANTIC', (component, key, expected) => {
    expect(value(`${scheme}_${component}`, key)).toBe(expected);
  });

  it('ninguna variante de los componentes conserva el gris de @tamagui/config', () => {
    const family =
      /_(Button|Switch|SwitchThumb|Checkbox|RadioGroupItem|Card|ListItem|Tooltip|TooltipContent|SliderTrack|Progress)$/;
    const checked = Object.keys(themes).filter(name => name.startsWith(`${scheme}_`) && family.test(name));
    expect(checked.length).toBeGreaterThan(0);
    const grays = checked.filter(name => /^hsl\(0, 0%/.test(String(value(name, 'background'))));
    expect(grays).toEqual([]);
  });
});
