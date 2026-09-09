import { NovaLogo } from '@/app/components/NovaLogo';

const destinations = [
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

import { IconSearch } from './Icons';

export function PrimaryNav({ active }: { active: NavTab }) {
  const isTabActive = (label: string) => {
    if (label === 'Today') return active === 'Today';
    if (label === 'Schedule') return active === 'Schedule';
    if (label === 'Timeline') return active === 'Timeline' || active === 'Journey';
    if (label === 'Diary') return active === 'Diary' || active === 'Learnings';
    return active === label;
  };

  return (
    <nav
      aria-label="Primary navigation"
      data-tour="primary-nav"
      className="animate-fade-up mb-8 flex flex-wrap items-center justify-between gap-x-3 gap-y-3 text-sm"
    >
      <div className="flex items-center gap-2.5 shrink-0">
        <a href="/" className="group flex items-center gap-2">
          <NovaLogo className="size-5 transition group-hover:scale-110" />
          <span className="text-sm font-bold tracking-[0.16em] text-stone-900 transition group-hover:text-stone-700">
            NOVA
          </span>
        </a>
        <span
          className="hidden text-[11px] font-medium tracking-wide text-stone-400 sm:inline"
          title="Newcomer Onboarding & Virtual Assistant"
        >
          · Cockpit
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
        {destinations.map((item) => {
          const activeItem = isTabActive(item.label);
          return (
            <a
              key={item.label}
              aria-current={activeItem ? 'page' : undefined}
              className={`inline-flex min-h-9 items-center justify-center rounded-full px-3.5 py-1 text-xs transition ${
                activeItem
                  ? 'bg-stone-900 font-semibold text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
              href={item.href}
            >
              {item.label}
            </a>
          );
        })}

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-stone-200/80 bg-stone-50/80 px-2.5 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition active:scale-95"
          title="Search & Quick Commands (⌘K or ?)"
          aria-label="Open command palette"
        >
          <IconSearch className="h-3.5 w-3.5" />
          <kbd className="hidden sm:inline-block rounded bg-stone-200/70 px-1.5 py-0.2 text-[10px] font-mono font-semibold text-stone-600">
            ⌘K
          </kbd>
        </button>
      </div>
    </nav>
  );
}
