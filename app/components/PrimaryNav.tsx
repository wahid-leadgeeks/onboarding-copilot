const destinations = [
  { label: 'Today', href: '/' },
  { label: 'Journey', href: '/journey' },
  { label: 'Learnings', href: '/history' },
  { label: 'Settings', href: '/settings' },
] as const;

export function PrimaryNav({ active }: { active: 'Today' | 'Journey' | 'Learnings' | 'Settings' }) {
  return (
    <nav aria-label="Primary navigation" data-tour="primary-nav" className="animate-fade-up mb-10 flex flex-wrap items-center gap-x-2 gap-y-3 text-sm">
      <div className="mr-auto flex items-baseline gap-2">
        <a href="/" className="text-sm font-bold tracking-[0.16em] text-stone-900 transition hover:text-stone-700">
          NOVA
        </a>
        <span className="hidden text-[11px] font-medium tracking-wide text-stone-400 sm:inline" title="Newcomer Onboarding & Virtual Assistant">
          · Newcomer Onboarding &amp; Virtual Assistant
        </span>
      </div>
      {destinations.map((item) => (
        <a key={item.label} aria-current={active === item.label ? 'page' : undefined} className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-1.5 transition ${active === item.label ? 'bg-stone-900 font-semibold text-white' : 'text-stone-500 hover:bg-stone-900/5 hover:text-stone-900'}`} href={item.href}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
