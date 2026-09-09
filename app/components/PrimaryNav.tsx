/**
 * PrimaryNav has been migrated to the persistent AppShell sidebar navigation
 * (app/components/AppShell.tsx).
 *
 * This file is retained for backwards compatibility and type exports.
 */

export const destinations = [
  { label: 'Today', href: '/' },
  { label: 'Schedule', href: '/schedule' },
  { label: 'Timeline', href: '/timeline' },
  { label: 'Diary', href: '/diary' },
  { label: 'Feedback', href: '/feedback' },
  { label: 'Reviews', href: '/reviews' },
  { label: 'Glossary', href: '/glossary' },
  { label: 'Settings', href: '/settings' },
] as const;

export type NavTab =
  | 'Today'
  | 'Schedule'
  | 'Timeline'
  | 'Diary'
  | 'Feedback'
  | 'Reviews'
  | 'Glossary'
  | 'Settings'
  | 'Journey'
  | 'Learnings';

export function PrimaryNav(_props: { active?: NavTab }) {
  // Navigation is now handled by the persistent sidebar AppShell
  return null;
}
