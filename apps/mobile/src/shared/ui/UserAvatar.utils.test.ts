import { getInitials } from './UserAvatar.utils';

describe('getInitials', () => {
  it.each([
    ['Ana Gomez', 'AG'],
    ['Admin', 'AD'],
    ['ana', 'AN'],
    ['J', 'J'],
    ['  maría  josé  pérez ', 'MJ'],
    ['😀Ana', '😀A'],
    ['😀 Ana', '😀A'],
    ['   ', ''],
    ['', ''],
  ])('"%s" → "%s"', (name, initials) => {
    expect(getInitials(name)).toBe(initials);
  });
});
