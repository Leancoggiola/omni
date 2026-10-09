import { getInitials } from './UserAvatar.utils';

describe('getInitials', () => {
  it.each([
    ['Leandro Coggiola', 'LC'],
    ['Admin', 'AD'],
    ['ana', 'AN'],
    ['J', 'J'],
    ['  maría  josé  pérez ', 'MJ'],
    ['   ', ''],
    ['', ''],
  ])('"%s" → "%s"', (name, initials) => {
    expect(getInitials(name)).toBe(initials);
  });
});
