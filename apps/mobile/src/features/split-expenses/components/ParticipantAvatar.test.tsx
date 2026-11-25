import { tamaguiConfig } from '@/theme/tamagui.config';

import { TONE_TOKENS } from './ParticipantAvatar';

describe('TONE_TOKENS', () => {
  it.each(['light', 'dark'] as const)('cada color de avatar existe en el theme %s de Tamagui', scheme => {
    const theme: Record<string, unknown> = tamaguiConfig.themes[scheme];

    for (const { fill, text } of Object.values(TONE_TOKENS)) {
      expect(theme[fill]).toBeDefined();
      expect(theme[text]).toBeDefined();
    }
  });
});
