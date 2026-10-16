import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { loadApp } from '@/lib/data';
import { endOfMonth, formatDate, startOfMonth, weekdayMondayFirst } from '@/lib/dates';
import { calendarDays, type DayStatus } from '@/lib/streak';
import { Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

const STYLE: Record<DayStatus, string> = {
  completed: 'bg-sage text-white',
  open: 'bg-peach-soft ring-1 ring-peach text-forest',
  partial: 'bg-peach-soft text-forest',
  missed: 'bg-cream-deep text-forest/60',
  future: 'text-forest/30',
  reset: 'bg-terracotta/15 text-terracotta-deep ring-1 ring-terracotta/40',
  rest: 'text-forest/30',
};

const LABEL: Record<DayStatus, string> = {
  completed: 'walked together',
  open: 'still open',
  partial: 'one of you confirmed',
  missed: 'not confirmed',
  future: '',
  reset: 'a fresh start',
  rest: '',
};

function shiftMonth(month: string, by: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const app = await loadApp();
  const { m } = await searchParams;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : app.today.slice(0, 7);
  const first = startOfMonth(`${month}-01`);
  const last = endOfMonth(first);
  const days = calendarDays(first, last, {
    today: app.today,
    journeys: app.journeys,
    members: app.people.map((p) => p.id),
    checkIns: app.checkIns,
  });
  const lead = weekdayMondayFirst(first);

  return (
    <Shell active="/history">
      <h1 className="text-2xl">History</h1>

      <div className="mb-3 mt-4 flex items-center justify-between">
        <Link href={`/history?m=${shiftMonth(month, -1)}`} className="btn-quiet min-h-10 px-3" aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h2 className="text-lg">{formatDate(first, { month: 'long', year: 'numeric' })}</h2>
        <Link href={`/history?m=${shiftMonth(month, 1)}`} className="btn-quiet min-h-10 px-3" aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="card">
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-forest/50" aria-hidden>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <ol className="mt-2 grid grid-cols-7 gap-1.5">
          {Array.from({ length: lead }).map((_, i) => (
            <li key={`b${i}`} aria-hidden />
          ))}
          {days.map((d) => (
            <li
              key={d.date}
              className={`flex aspect-square items-center justify-center rounded-xl text-sm ${STYLE[d.status]} ${
                d.date === app.today ? 'outline outline-2 outline-offset-1 outline-forest' : ''
              }`}
              title={`${formatDate(d.date)}${LABEL[d.status] ? ' — ' + LABEL[d.status] : ''}`}
            >
              <span className="sr-only">{formatDate(d.date)}: {LABEL[d.status] || 'no journey'}</span>
              <span aria-hidden>{Number(d.date.slice(8))}</span>
            </li>
          ))}
        </ol>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2 text-xs text-forest/70">
        <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-sage" /> Walked together</li>
        <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-peach-soft ring-1 ring-peach" /> Open / one confirmed</li>
        <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-cream-deep" /> Not confirmed</li>
        <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-terracotta/15 ring-1 ring-terracotta/40" /> Fresh start</li>
      </ul>
      <p className="mt-3 text-xs text-forest/60">
        A day with no confirmation is simply a day not walked. It never resets your streak by itself.
      </p>

      <section className="mt-8">
        <h2 className="text-lg">Fresh starts</h2>
        {app.resets.length === 0 ? (
          <p className="mt-2 text-sm text-forest/65">None so far. Whatever comes, grace is already waiting.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {app.resets.map((r) => (
              <li key={r.id} className="card py-3 text-sm">
                <span className="font-medium">{formatDate(r.localDate, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                {' · '}
                {r.daysWalked} {r.daysWalked === 1 ? 'day' : 'days'} walked
                <span className="block text-forest/60">
                  Reported by {r.initiatedBy}
                  {r.challenge && ` · ${r.challengeCompletedAt ? 'challenge done' : 'challenge chosen'}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Shell>
  );
}
