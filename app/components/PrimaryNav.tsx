const destinations = [
  { label: 'Today', href: '/' },
  { label: 'Journey', href: '/journey' },
  { label: 'Learnings', href: '/history' },
  { label: 'Settings', href: '/settings' },
] as const;

export function PrimaryNav({ active }: { active: 'Today' | 'Journey' | 'Learnings' | 'Settings' }) {
  return (
    <nav aria-label="Primary navigation" className="mb-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
      <p className="mr-auto text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Onboarding Copilot</p>
      {destinations.map((item) => (
        <a key={item.label} aria-current={active === item.label ? 'page' : undefined} className={active === item.label ? 'font-semibold text-slate-900' : 'text-slate-500 transition hover:text-slate-900'} href={item.href}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
