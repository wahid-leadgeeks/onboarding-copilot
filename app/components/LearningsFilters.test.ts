import { filterLabelClass, selectClass } from './LearningsFilters';

/**
 * Regression coverage for the 375px horizontal overflow in the learnings
 * filter row: the native Activity select claimed its intrinsic width and its
 * flex label defaulted to `min-width: auto`, so a long activity label pushed
 * the page wider than the viewport. The contracts below keep the shared
 * select and the flex labels shrinkable while preserving every other style.
 */
describe('LearningsFilters responsive class contract', () => {
  it('keeps the shared select shrinkable and capped to its container', () => {
    expect(selectClass.includes('min-w-0')).toBe(true);
    expect(selectClass.includes('max-w-full')).toBe(true);
  });

  it('keeps flex filter labels shrinkable below their content width', () => {
    expect(filterLabelClass.includes('min-w-0')).toBe(true);
  });

  it('preserves the 44px minimum touch target on both shared classes', () => {
    expect(selectClass.includes('min-h-11')).toBe(true);
    expect(filterLabelClass.includes('min-h-11')).toBe(true);
  });
});
