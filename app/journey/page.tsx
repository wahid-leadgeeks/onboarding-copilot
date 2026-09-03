import { PrimaryNav } from '@/app/components/PrimaryNav';

const totalDays = 90;
const journeyStart = Date.UTC(2026, 8, 1);

const phases = [
  { name: 'Foundation', period: 'Days 1-30', description: 'Understand the company, your team, and the systems that keep work moving.', status: 'completed', chip: 'bg-mint-50 text-mint-700' },
  { name: 'Growth', period: 'Days 31-60', description: 'Build confidence through practice, pairing, and increasingly independent work.', status: 'current', chip: 'bg-lavender-50 text-lavender-700' },
  { name: 'Impact', period: 'Days 61-90', description: 'Own meaningful outcomes and make your contribution visible to the team.', status: 'upcoming', chip: 'bg-peach-50 text-peach-700' },
] as const;

const milestones = [
  { day: 1, title: 'Welcome and orientation', detail: 'Meet the team and get your bearings.', status: 'completed' },
  { day: 7, title: 'Tools and access in place', detail: 'Be ready to work in the core systems.', status: 'completed' },
  { day: 30, title: 'Foundation complete', detail: 'Understand the environment and how work flows.', status: 'current' },
  { day: 60, title: 'First independent contribution', detail: 'Take ownership of a piece of work.', status: 'upcoming' },
  { day: 90, title: 'Onboarding complete', detail: 'Reflect on your progress and choose what is next.', status: 'upcoming' },
] as const;

function getJourneyDay(now: Date) {
  const elapsedDays = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - journeyStart) / 86400000);
  return Math.min(totalDays, Math.max(1, elapsedDays + 1));
}

export default function JourneyPage() {
  const day = getJourneyDay(new Date());
  const percentage = Math.round((day / totalDays) * 100);
  const growthEmoji = percentage <= 25 ? '🌱' : percentage <= 60 ? '🌿' : '🌳';
  const progressNote = percentage >= 90 ? 'Almost there! 🌱' : 'Growing steadily.';

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-6 text-stone-900 sm:px-8 sm:py-8">
      <PrimaryNav active="Journey" />
      <header className="animate-fade-up pb-8">
        <p className="text-sm font-medium text-stone-500">Your 90-day journey</p>
        <div className="mt-2 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">A clear path forward. 🌱</h1>
            <p className="mt-3 max-w-xl text-lg text-stone-600">See where you are, and what's next.</p>
          </div>
          <div className="w-fit rounded-full bg-mint-50 px-4 py-1.5 text-sm font-semibold text-mint-700">Day {day} of {totalDays}</div>
        </div>
      </header>

      <section aria-labelledby="progress-heading" className="animate-fade-up stagger-1 mt-8 rounded-card bg-white p-8 shadow-soft">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 id="progress-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Your journey</h2>
            <p className="mt-4 text-6xl font-semibold tracking-tight text-stone-900">{percentage}%</p>
            <p className="mt-2 text-sm font-medium text-stone-500">of your 90 days</p>
          </div>
          <span className="animate-float shrink-0 text-5xl" aria-hidden="true">{growthEmoji}</span>
        </div>
        <div className="mt-8 h-2.5 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-label="90-day journey progress" aria-valuemin={1} aria-valuemax={totalDays} aria-valuenow={day}><div className="bar-gradient progress-shimmer h-full rounded-full" style={{ width: `${percentage}%` }} /></div>
        <div className="mt-3 flex justify-between text-xs font-medium text-stone-400"><span>Day 1</span><span>Day 90</span></div>
        <p className="mt-6 text-sm font-medium text-stone-500">{progressNote}</p>
      </section>

      <section aria-labelledby="phases-heading" className="animate-fade-up stagger-2 mt-10">
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Your path</p><h2 id="phases-heading" className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">Three phases, one direction.</h2></div><p className="hidden text-sm text-stone-500 sm:block">Context to confidence to contribution</p></div>
        <div className="grid gap-4 lg:grid-cols-3">
          {phases.map((phase, index) => <article key={phase.name} className={`animate-fade-up stagger-${index + 1} rounded-card bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-lift ${phase.status === 'current' ? 'ring-2 ring-mint-300' : ''}`}>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${phase.chip}`}>{phase.status === 'completed' ? 'Done ✓' : phase.status === 'current' ? 'You are here' : 'Up next'}</span>
            <h3 className="mt-6 text-xl font-semibold text-stone-900">{phase.name}</h3><p className="mt-1 text-sm font-medium text-stone-500">{phase.period}</p><p className="mt-4 text-sm leading-6 text-stone-600">{phase.description}</p>
          </article>)}
        </div>
      </section>

      <section aria-labelledby="milestones-heading" className="animate-fade-up stagger-3 mt-12">
        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">What comes next</p><h2 id="milestones-heading" className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">Milestones along the way.</h2></div><span className="text-sm text-stone-500">5 moments</span></div>
        <ol className="border-l-2 border-stone-100 pl-6 sm:pl-8">
          {milestones.map((milestone) => <li key={milestone.day} className="relative pb-8 last:pb-0">
            <span className={`absolute -left-[39px] top-1 flex h-7 w-7 items-center justify-center rounded-full text-xs ring-4 ring-cream sm:-left-[47px] ${milestone.status === 'completed' ? 'bg-mint-500 text-white' : milestone.status === 'current' ? 'animate-pulse-soft bg-peach-500' : 'border-2 border-stone-300'}`} aria-hidden="true">{milestone.status === 'completed' ? '✓' : milestone.status === 'current' ? <span className="h-2 w-2 rounded-full bg-white" /> : null}</span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-8"><div><p className={`text-xs font-semibold uppercase tracking-[0.16em] ${milestone.status === 'completed' ? 'text-mint-700' : milestone.status === 'current' ? 'text-peach-700' : 'text-stone-400'}`}>{milestone.status === 'completed' ? 'Done ✓' : milestone.status === 'current' ? 'You are here' : 'Up next'}</p><h3 className="mt-2 font-semibold text-stone-900">{milestone.title}</h3><p className="mt-1 text-sm leading-6 text-stone-500">{milestone.detail}</p></div><span className="shrink-0 text-sm font-medium text-stone-400">Day {milestone.day}</span></div>
          </li>)}
        </ol>
      </section>

      <aside className="animate-fade-up stagger-4 mt-12 rounded-card bg-lavender-50 p-6 sm:flex sm:items-center sm:justify-between sm:gap-8"><div><p className="text-base font-semibold text-lavender-700">Make today count. ✨</p><p className="mt-1 text-sm leading-6 text-stone-600">Your next step is waiting on Today.</p></div><a href="/" className="mt-4 inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 sm:mt-0">Go to Today</a></aside>
    </main>
  );
}
