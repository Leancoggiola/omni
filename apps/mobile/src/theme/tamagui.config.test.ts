import { SEMANTIC } from '@omni/shared/theme';

import { config } from '@tamagui/config';

import { COMPONENT_THEMES, tamaguiConfig } from './tamagui.config';

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

  it('toda variante de COMPONENT_THEMES se reconstruye (ninguna conserva el valor de @tamagui/config)', () => {
    const originals = config.themes as unknown as Record<string, Record<string, unknown>>;
    const names = Object.keys(originals).filter(
      name => name.startsWith(`${scheme}_`) && COMPONENT_THEMES.includes(name.split('_').pop() ?? '')
    );
    expect(names.length).toBeGreaterThan(0);
    const untouched = names.filter(name => value(name, 'background') === originals[name].background);
    expect(untouched).toEqual([]);
  });

  it('las variantes _red de Slider y Progress activos van en destructivo', () => {
    expect(value(`${scheme}_red_SliderTrackActive`, 'background')).toBe(s.destructive);
    expect(value(`${scheme}_red_ProgressIndicator`, 'background')).toBe(s.destructive);
  });
});
