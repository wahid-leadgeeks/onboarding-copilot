import { NAV_ITEMS, isNavItemActive } from './AppShell';
import { allPagesTourSteps } from './GuideTour';

describe('AppShell navigation', () => {
  it('has eight primary nav items', () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      '/',
      '/schedule',
      '/timeline',
      '/reviews',
      '/diary',
      '/feedback',
      '/glossary',
      '/settings',
    ]);
  });

  it('keeps Reviews active on its sub-pages', () => {
    const reviews = NAV_ITEMS.find((item) => item.href === '/reviews');
    expect(reviews).toBeDefined();
    for (const path of ['/reviews', '/first-month-review', '/monthly-review-score']) {
      expect(isNavItemActive(reviews!, path)).toBe(true);
      const active = NAV_ITEMS.filter((item) => isNavItemActive(item, path));
      expect(active.map((item) => item.label)).toEqual(['Reviews']);
    }
  });

  it('only marks Today active on the root route', () => {
    const today = NAV_ITEMS.find((item) => item.href === '/');
    expect(isNavItemActive(today!, '/')).toBe(true);
    expect(isNavItemActive(today!, '/schedule')).toBe(false);
  });

  it('does not match routes that merely share a prefix', () => {
    const diary = NAV_ITEMS.find((item) => item.href === '/diary');
    expect(isNavItemActive(diary!, '/diary')).toBe(true);
    expect(isNavItemActive(diary!, '/diary-archive')).toBe(false);
  });

  it('no guide tour step targets a nav item that no longer exists', () => {
    const navTargets = new Set(NAV_ITEMS.map((item) => item.tourId).filter(Boolean));
    const tourNavTargets = allPagesTourSteps
      .map((step) => step.target)
      .filter((target): target is string => typeof target === 'string' && target.startsWith('nav-'));
    for (const target of tourNavTargets) {
      expect(navTargets.has(target)).toBe(true);
    }
  });
});
