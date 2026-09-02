export function PrimaryNav({ active }: { active: 'Today' | 'History' | 'Settings' }) {
  return <nav aria-label="Primary navigation" className="mb-8 flex gap-4 text-sm">{(['Today', 'History', 'Settings'] as const).map((item) => <a key={item} aria-current={active === item ? 'page' : undefined} className={active === item ? 'font-medium' : 'text-slate-500'} href={item === 'Today' ? '/' : `/${item.toLowerCase()}`}>{item}</a>)}</nav>;
}
