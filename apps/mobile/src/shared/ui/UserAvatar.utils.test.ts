import { getInitials } from './UserAvatar.utils';

describe('getInitials', () => {
  it.each([
    ['Leandro Coggiola', 'LC'],
    ['ana', 'A'],
    ['  maría  josé  pérez ', 'MJ'],
    ['', ''],
  ])('"%s" → "%s"', (name, initials) => {
    expect(getInitials(name)).toBe(initials);
  });
});
