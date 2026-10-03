import { nextMenuIndex } from './SheetToolsMenu';

describe('nextMenuIndex', () => {
  it('moves and wraps in both directions', () => {
    expect(nextMenuIndex(0, 1, 3)).toBe(1);
    expect(nextMenuIndex(2, 1, 3)).toBe(0);
    expect(nextMenuIndex(0, -1, 3)).toBe(2);
    expect(nextMenuIndex(1, -1, 3)).toBe(0);
  });

  it('starts from the first or last item when nothing is focused', () => {
    expect(nextMenuIndex(-1, 1, 4)).toBe(0);
    expect(nextMenuIndex(-1, -1, 4)).toBe(3);
    expect(nextMenuIndex(9, 1, 4)).toBe(0);
  });

  it('keeps the index for a zero delta and returns -1 for an empty menu', () => {
    expect(nextMenuIndex(2, 0, 4)).toBe(2);
    expect(nextMenuIndex(0, 1, 0)).toBe(-1);
  });
});
