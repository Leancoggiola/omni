import { describe, expect, it } from 'vitest';

import { buildProfileUpdates, normalizeOptionalText } from '..';

describe('normalizeOptionalText', () => {
  it('recorta y trata vacío o solo espacios como sin valor', () => {
    expect(normalizeOptionalText('  +54 11 5555  ')).toBe('+54 11 5555');
    expect(normalizeOptionalText('   ')).toBeNull();
    expect(normalizeOptionalText('')).toBeNull();
  });
});

describe('buildProfileUpdates', () => {
  const profile = { phone: null, birthDate: null };

  it('sin cambios no manda nada', () => {
    expect(buildProfileUpdates({ phone: '123', birthDate: null }, { phone: ' 123 ', birthDate: null })).toEqual({});
    expect(buildProfileUpdates(profile, { phone: '' })).toEqual({});
  });

  it('manda el teléfono normalizado, o null al vaciarlo', () => {
    expect(buildProfileUpdates(profile, { phone: ' +34 600 ' })).toEqual({ phone: '+34 600' });
    expect(buildProfileUpdates({ phone: '+34 600', birthDate: null }, { phone: '  ' })).toEqual({ phone: null });
  });

  it('manda la fecha de nacimiento como medianoche UTC del día elegido', () => {
    expect(buildProfileUpdates(profile, { phone: '', birthDate: '1990-05-15' })).toEqual({
      birthDate: '1990-05-15T00:00:00.000Z',
    });
  });

  it('compara la fecha por día de calendario, y null la borra', () => {
    const withBirthDate = { phone: null, birthDate: '1990-05-15T03:00:00.000Z' };

    expect(buildProfileUpdates(withBirthDate, { phone: '', birthDate: '1990-05-15' })).toEqual({});
    expect(buildProfileUpdates(withBirthDate, { phone: '', birthDate: null })).toEqual({ birthDate: null });
  });

  it('sin birthDate en los valores (el formulario no la edita) no la manda', () => {
    expect(buildProfileUpdates({ phone: null, birthDate: '1990-05-15T00:00:00.000Z' }, { phone: '1' })).toEqual({
      phone: '1',
    });
  });
});
