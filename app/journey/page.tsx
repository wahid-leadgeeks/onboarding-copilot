import { PrimaryNav } from '@/app/components/PrimaryNav';

const totalDays = 90;
const journeyStart = Date.UTC(2026, 8, 1);

const phases = [
  { name: 'Foundation', period: 'Days 1-30', description: 'Understand the company, your team, and the systems that keep work moving.', status: 'completed', accent: 'border-emerald-200 bg-emerald-50', marker: 'bg-emerald-600' },
  { name: 'Growth', period: 'Days 31-60', description: 'Build confidence through practice, pairing, and increasingly independent work.', status: 'current', accent: 'border-indigo-200 bg-indigo-50', marker: 'bg-indigo-600' },
  { name: 'Impact', period: 'Days 61-90', description: 'Own meaningful outcomes and make your contribution visible to the team.', status: 'upcoming', accent: 'border-slate-200 bg-white', marker: 'bg-slate-300' },
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

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-6 text-slate-900 sm:px-8 sm:py-8">
      <PrimaryNav active="Journey" />
      <header className="border-b border-slate-200 pb-8">
        <p className="text-sm font-medium text-slate-500">Your 90-day journey</p>
        <div className="mt-2 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">A clear path forward.</h1>
            <p className="mt-3 max-w-xl text-lg text-slate-600">See where you are, what you have built, and the next moment worth preparing for.</p>
          </div>
          <div className="w-fit rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-900">Day {day} of {totalDays}</div>
        </div>
      </header>

      <section aria-labelledby="progress-heading" className="mt-8 rounded-3xl bg-slate-900 p-6 text-white shadow-lg shadow-slate-900/10 sm:p-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">The big picture</p><h2 id="progress-heading" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Keep your momentum.</h2><p className="mt-2 max-w-lg text-sm leading-6 text-slate-300">Every day is a small step toward working with confidence. Your journey builds from context to contribution.</p></div>
          <p className="text-sm font-medium text-slate-300">{percentage}% of your journey</p>
        </div>
        <div className="mt-7 h-2 overflow-hidden rounded-full bg-slate-700" role="progressbar" aria-label="90-day journey progress" aria-valuemin={1} aria-valuemax={totalDays} aria-valuenow={day}><div className="h-full rounded-full bg-indigo-400" style={{ width: `${percentage}%` }} /></div>
        <div className="mt-3 flex justify-between text-xs text-slate-400"><span>Day 1</span><span>Day 90</span></div>
      </section>

      <section aria-labelledby="phases-heading" className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Your path</p><h2 id="phases-heading" className="mt-2 text-2xl font-semibold tracking-tight">Three phases, one direction.</h2></div><p className="hidden text-sm text-slate-500 sm:block">Context to confidence to contribution</p></div>
        <div className="grid gap-4 lg:grid-cols-3">
          {phases.map((phase) => <article key={phase.name} className={`rounded-2xl border p-5 ${phase.accent} ${phase.status === 'current' ? 'ring-2 ring-indigo-100' : ''}`}>
            <div className="flex items-center justify-between gap-4"><span className={`h-3 w-3 rounded-full ${phase.marker}`} aria-hidden="true" /><span className={`text-xs font-semibold uppercase tracking-[0.16em] ${phase.status === 'completed' ? 'text-emerald-700' : phase.status === 'current' ? 'text-indigo-700' : 'text-slate-500'}`}>{phase.status === 'completed' ? 'Complete' : phase.status === 'current' ? 'You are here' : 'Up next'}</span></div>
            <h3 className="mt-6 text-xl font-semibold text-slate-900">{phase.name}</h3><p className="mt-1 text-sm font-medium text-slate-500">{phase.period}</p><p className="mt-4 text-sm leading-6 text-slate-600">{phase.description}</p>
          </article>)}
        </div>
      </section>

      <section aria-labelledby="milestones-heading" className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">What comes next</p><h2 id="milestones-heading" className="mt-2 text-2xl font-semibold tracking-tight">Milestones along the way.</h2></div><span className="text-sm text-slate-500">5 moments</span></div>
        <ol className="relative border-l border-slate-200 pl-6 sm:pl-8">
          {milestones.map((milestone) => <li key={milestone.day} className="relative pb-8 last:pb-0">
            <span className={`absolute -left-[calc(1.5rem+0.3125rem)] top-1 h-3 w-3 rounded-full ring-4 ring-slate-50 sm:-left-[calc(2rem+0.3125rem)] ${milestone.status === 'completed' ? 'bg-emerald-600' : milestone.status === 'current' ? 'bg-indigo-600' : 'bg-slate-300'}`} aria-hidden="true" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-8"><div><p className={`text-xs font-semibold uppercase tracking-[0.16em] ${milestone.status === 'completed' ? 'text-emerald-700' : milestone.status === 'current' ? 'text-indigo-700' : 'text-slate-500'}`}>{milestone.status === 'completed' ? 'Completed' : milestone.status === 'current' ? 'Current milestone' : 'Upcoming'}</p><h3 className="mt-2 font-semibold text-slate-900">{milestone.title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{milestone.detail}</p></div><span className="shrink-0 text-sm font-medium text-slate-500">Day {milestone.day}</span></div>
          </li>)}
        </ol>
      </section>

      <aside className="mt-12 rounded-2xl border border-indigo-100 bg-indigo-50 p-5 sm:flex sm:items-center sm:justify-between sm:gap-8"><div><p className="text-sm font-semibold text-indigo-950">Make today count.</p><p className="mt-1 text-sm leading-6 text-indigo-900/70">Your next action is waiting on Today. Keep the journey in view, then focus on one thing.</p></div><a href="/" className="mt-4 inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 sm:mt-0">Go to Today</a></aside>
    </main>
  );
}
