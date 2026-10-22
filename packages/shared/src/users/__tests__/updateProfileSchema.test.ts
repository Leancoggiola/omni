import { describe, expect, it } from 'vitest';

import { updateProfileSchema } from '..';

describe('updateProfileSchema', () => {
  it('accepts editable profile fields', () => {
    expect(updateProfileSchema.parse({ phone: '+34 600 000 000' })).toEqual({
      phone: '+34 600 000 000',
    });
  });

  it('rejects immutable name and email', () => {
    expect(() => updateProfileSchema.parse({ name: 'Otro nombre' })).toThrow();
    expect(() => updateProfileSchema.parse({ email: 'otro@example.com' })).toThrow();
  });

  it('rejects unknown fields', () => {
    expect(() => updateProfileSchema.parse({ username: 'hacker' })).toThrow();
  });
});
