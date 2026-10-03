'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface ReviewsTab {
  readonly href: string;
  readonly label: string;
}

/** The three pages that make up the Reviews section, in display order. */
export const REVIEWS_TABS: readonly ReviewsTab[] = [
  { href: '/reviews', label: 'Overview' },
  { href: '/first-month-review', label: 'First month' },
  { href: '/monthly-review-score', label: 'Monthly score' },
];

/** The tab that is current for `pathname` (exact route or a sub-path), or null outside Reviews. */
export function currentReviewsTab(pathname: string | null | undefined): ReviewsTab | null {
  if (!pathname) return null;
  return REVIEWS_TABS.find((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`)) ?? null;
}

/** Section navigation shared by /reviews, /first-month-review and /monthly-review-score. */
export function ReviewsTabs({ className = '' }: { className?: string }) {
  const current = currentReviewsTab(usePathname());

  return (
    <nav aria-label="Reviews sections" className={`min-w-0 ${className}`}>
      <ul className="flex min-w-0 gap-1 overflow-x-auto rounded-2xl bg-stone-100 p-1">
        {REVIEWS_TABS.map((tab) => {
          const active = current?.href === tab.href;
          return (
            <li key={tab.href} className="min-w-0 flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl px-3 text-xs font-semibold transition ${
                  active ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:bg-white/60 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
