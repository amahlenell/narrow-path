import Link from 'next/link';
import { Settings, Trophy } from 'lucide-react';
import { loadApp } from '@/lib/data';
import { addDays, daysUntil, formatDate } from '@/lib/dates';
import { todayState } from '@/lib/streak';
import { verseOfTheDay } from '@/content/scripture';
import { milestoneContent } from '@/content/milestones';
import { Pathway } from '@/components/Pathway';
import { CheckInCard } from '@/components/CheckInCard';
import { LiveRefresh } from '@/components/LiveRefresh';
import { WeddingCard } from '@/components/WeddingCard';
import { Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const app = await loadApp();
  const ids = app.people.map((p) => p.id);
  const t = todayState({ today: app.today, journey: app.current, members: ids, checkIns: app.checkIns });
  const verse = verseOfTheDay(app.today);
  const nextContent = app.next ? milestoneContent(app.next.days) : null;
  const names: [string, string] = [app.me.name, app.partner?.name ?? 'Your partner'];

  return (
    <Shell active="/">
      <LiveRefresh coupleId={app.coupleId} />

      <header className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sage">{app.coupleName}</p>
          <h1 className="text-2xl">Hello, {app.me.name}</h1>
        </div>
        <Link href="/settings" aria-label="Settings" className="flex h-11 w-11 items-center justify-center rounded-full text-forest/60 ring-1 ring-forest/10">
          <Settings className="h-5 w-5" aria-hidden />
        </Link>
      </header>

      {!app.partner && (
        <section className="card mb-4 text-center">
          <h2 className="text-xl">Invite your partner</h2>
          {app.inviteActive ? (
            <>
              <p className="mt-2 text-sm text-forest/70">Give them this one-time code. It works for 7 days.</p>
              <p className="mt-3 select-all rounded-2xl bg-cream px-4 py-3 font-mono text-2xl tracking-[0.25em]">
                {app.inviteCode}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-forest/70">This invite code has expired. For now, create a new one by running the “refresh invite” SQL in the README.</p>
          )}
        </section>
      )}

      <section className="card overflow-hidden p-0" aria-label="Your journey">
        <div className="px-5 pt-5 text-center">
          <p className="text-sm text-forest/60">Days walked together</p>
          <p className="font-serif text-6xl leading-none text-forest" aria-live="polite">{app.walked}</p>
          {app.next ? (
            <p className="mt-2 text-sm text-forest/70">
              {app.next.remaining} {app.next.remaining === 1 ? 'day' : 'days'} to{' '}
              <span className="font-medium">{nextContent?.place ?? `day ${app.next.days}`}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-forest/70">You’ve reached every checkpoint. Look how far you’ve come.</p>
          )}
        </div>
        <Pathway
          walked={app.walked}
          milestoneDays={app.milestoneDays}
          unlockedDays={app.unlockedDays}
          names={names}
          className="mt-2 w-full"
        />
      </section>

      <div className="mt-4 space-y-4">
        <CheckInCard
          people={app.people.map((p) => ({
            ...p,
            today: t.today[p.id] ?? false,
            yesterday: t.yesterday[p.id] ?? false,
          }))}
          partnerJoined={Boolean(app.partner)}
          journeyStarted={t.journeyStarted}
          todayComplete={t.todayComplete}
          yesterdayOpen={t.yesterdayOpen}
          yesterdayLabel="yesterday"
          yesterdayDate={t.yesterdayDate}
        />

        <section className="card" aria-labelledby="verse-h">
          <h2 id="verse-h" className="text-sm font-medium uppercase tracking-widest text-sage">Today’s word</h2>
          <blockquote className="mt-3 font-serif text-xl leading-snug">“{verse.text}”</blockquote>
          <p className="mt-2 text-sm text-forest/60">{verse.reference} · KJV</p>
          <p className="mt-3 text-forest/80">{verse.reflection}</p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/milestones" className="btn-quiet">
            <Trophy className="h-4 w-4" aria-hidden /> Milestones
          </Link>
          <Link href="/reset" className="btn-quiet">Report a reset</Link>
        </div>

        <section className="card text-center text-sm text-forest/70" aria-label="Lifetime progress">
          <p>
            <span className="font-medium text-forest">{app.stats.lifetimeDays}</span> days walked in all ·{' '}
            longest stretch <span className="font-medium text-forest">{app.stats.longest}</span> ·{' '}
            {app.stats.resets === 0 ? 'no restarts' : `${app.stats.resets} fresh ${app.stats.resets === 1 ? 'start' : 'starts'}`}
          </p>
          <p className="mt-1 text-xs text-forest/50">Lifetime progress is never erased by a reset.</p>
        </section>

        <WeddingCard
          coupleId={app.coupleId}
          weddingDate={app.weddingDate}
          daysUntil={app.weddingDate ? daysUntil(app.weddingDate, app.today) : null}
          prettyDate={app.weddingDate ? formatDate(app.weddingDate, { day: 'numeric', month: 'long', year: 'numeric' }) : null}
        />

        {!t.journeyStarted && (
          <p className="text-center text-xs text-forest/50">
            New stretch begins {formatDate(addDays(app.today, 1))}.
          </p>
        )}
      </div>
    </Shell>
  );
}
