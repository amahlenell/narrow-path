import { loadApp } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { DEVOTIONALS, HARD_DAY_MESSAGES, QUESTIONS, pickForDate } from '@/content/growing';
import { verseById, verseOfTheDay } from '@/content/scripture';
import { PrayerList, type Prayer } from '@/components/PrayerList';
import { Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

export default async function GrowingPage() {
  const app = await loadApp();
  const supabase = await createClient();
  const { data } = await supabase
    .from('prayer_intentions')
    .select('id, body, author_id, answered_at, created_at')
    .eq('couple_id', app.coupleId)
    .order('created_at', { ascending: false });

  const prayers: Prayer[] = (data ?? []).map((p) => ({
    id: p.id as string,
    body: p.body as string,
    byMe: p.author_id === app.userId,
    authorName: app.people.find((x) => x.id === p.author_id)?.name ?? 'Your partner',
    answered: Boolean(p.answered_at),
  }));

  const verse = verseOfTheDay(app.today);
  const devotional = pickForDate(DEVOTIONALS, app.today);
  const devVerse = verseById(devotional.verseId);
  const question = pickForDate(QUESTIONS, app.today, 3);
  const encouragement = pickForDate(HARD_DAY_MESSAGES, app.today);

  return (
    <Shell active="/growing">
      <h1 className="text-2xl">Growing Together</h1>
      <div className="mt-4 space-y-4">
        <section className="card">
          <h2 className="text-sm font-medium uppercase tracking-widest text-sage">Today’s scripture</h2>
          <blockquote className="mt-3 font-serif text-xl leading-snug">“{verse.text}”</blockquote>
          <p className="mt-2 text-sm text-forest/60">{verse.reference} · KJV</p>
          <p className="mt-3 text-forest/80">{verse.reflection}</p>
        </section>

        <section className="card">
          <h2 className="text-sm font-medium uppercase tracking-widest text-sage">Couples’ devotional</h2>
          <h3 className="mt-2 text-xl">{devotional.title}</h3>
          {devVerse && (
            <p className="mt-2 text-sm italic text-forest/70">
              “{devVerse.text}” <span className="not-italic">— {devVerse.reference}</span>
            </p>
          )}
          <p className="mt-3 text-forest/80">{devotional.body}</p>
          <p className="mt-3 rounded-2xl bg-cream px-4 py-3 text-sm">
            <span className="font-medium">Together: </span>{devotional.together}
          </p>
        </section>

        <section className="card">
          <h2 className="text-sm font-medium uppercase tracking-widest text-sage">A question for tonight</h2>
          <p className="mt-3 font-serif text-xl leading-snug">{question}</p>
        </section>

        <section className="card">
          <h2 className="text-sm font-medium uppercase tracking-widest text-sage">Shared prayer intentions</h2>
          <div className="mt-3">
            <PrayerList coupleId={app.coupleId} userId={app.userId} prayers={prayers} />
          </div>
        </section>

        <section className="card bg-peach-soft/70">
          <h2 className="text-sm font-medium uppercase tracking-widest text-terracotta-deep">For a difficult day</h2>
          <p className="mt-3 text-forest/85">{encouragement}</p>
        </section>
      </div>
    </Shell>
  );
}
