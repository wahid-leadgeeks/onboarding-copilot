import { NovaLogo } from '@/app/components/NovaLogo';

const destinations = [
  { label: 'Schedule', href: '/' },
  { label: 'Timeline', href: '/timeline' },
  { label: 'Diary', href: '/diary' },
  { label: 'Feedback', href: '/feedback' },
  { label: 'Reviews', href: '/reviews' },
  { label: 'Glossary', href: '/glossary' },
  { label: 'Settings', href: '/settings' },
] as const;

export type NavTab =
  | 'Schedule'
  | 'Timeline'
  | 'Diary'
  | 'Feedback'
  | 'Reviews'
  | 'Glossary'
  | 'Settings'
  | 'Today'
  | 'Journey'
  | 'Learnings';

export function PrimaryNav({ active }: { active: NavTab }) {
  const isTabActive = (label: string) => {
    if (label === 'Schedule') return active === 'Schedule' || active === 'Today';
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
      </div>
    </nav>
  );
}
