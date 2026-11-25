import { moveItem } from './reorder';

describe('moveItem', () => {
  it('sube y baja un lugar sin tocar el original', () => {
    const items = ['a', 'b', 'c'];

    expect(moveItem(items, 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(items, 1, 1)).toEqual(['a', 'c', 'b']);
    expect(items).toEqual(['a', 'b', 'c']);
  });

  it('en los extremos o fuera de rango queda igual', () => {
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 5, -1)).toEqual(['a', 'b']);
  });
});
