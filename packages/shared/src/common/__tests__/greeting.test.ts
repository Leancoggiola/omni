import { describe, expect, it } from 'vitest';

import { getTimeGreeting } from '..';

const at = (time: string) => new Date(`2024-01-01T${time}`);

describe('getTimeGreeting', () => {
  it.each([
    ['06:00:00', 'Buenos días'],
    ['11:59:59', 'Buenos días'],
    ['12:00:00', 'Buenas tardes'],
    ['19:59:59', 'Buenas tardes'],
    ['20:00:00', 'Buenas noches'],
    ['03:00:00', 'Buenas noches'],
    ['05:59:59', 'Buenas noches'],
  ])('a las %s dice "%s"', (time, greeting) => {
    expect(getTimeGreeting(at(time))).toBe(greeting);
  });
});
