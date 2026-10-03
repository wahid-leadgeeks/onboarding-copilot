import { REVIEWS_TABS, currentReviewsTab } from './ReviewsTabs';
import { OPEN_MENU_SELECTOR, shouldSheetCloseOnEscape } from './sheetEscape';

describe('ReviewsTabs', () => {
  it('lists the three Reviews pages in order', () => {
    expect(REVIEWS_TABS.map((tab) => [tab.href, tab.label])).toEqual([
      ['/reviews', 'Overview'],
      ['/first-month-review', 'First month'],
      ['/monthly-review-score', 'Monthly score'],
    ]);
  });

  it('marks exactly the matching tab current on each page', () => {
    expect(currentReviewsTab('/reviews')?.label).toBe('Overview');
    expect(currentReviewsTab('/first-month-review')?.label).toBe('First month');
    expect(currentReviewsTab('/monthly-review-score')?.label).toBe('Monthly score');
    expect(currentReviewsTab('/reviews/anything')?.label).toBe('Overview');
  });

  it('has no current tab outside Reviews', () => {
    expect(currentReviewsTab('/')).toBeNull();
    expect(currentReviewsTab('/reviewsx')).toBeNull();
    expect(currentReviewsTab('/timeline')).toBeNull();
    expect(currentReviewsTab(null)).toBeNull();
    expect(currentReviewsTab(undefined)).toBeNull();
  });
});

describe('shouldSheetCloseOnEscape (stubbed closest)', () => {
  const target = (insideMenu: boolean) => ({
    closest: (selector: string) => (selector === OPEN_MENU_SELECTOR && insideMenu ? {} : null),
  });

  it('closes on Escape outside an open menu', () => {
    expect(shouldSheetCloseOnEscape({ key: 'Escape', target: target(false) })).toBe(true);
  });

  it('leaves Escape to an open menu or its expanded trigger', () => {
    expect(shouldSheetCloseOnEscape({ key: 'Escape', target: target(true) })).toBe(false);
  });

  it('ignores other keys', () => {
    expect(shouldSheetCloseOnEscape({ key: 'Enter', target: target(false) })).toBe(false);
  });

  it('closes when the target cannot be inspected (e.g. window)', () => {
    expect(shouldSheetCloseOnEscape({ key: 'Escape', target: null })).toBe(true);
    expect(shouldSheetCloseOnEscape({ key: 'Escape', target: {} })).toBe(true);
  });
});
