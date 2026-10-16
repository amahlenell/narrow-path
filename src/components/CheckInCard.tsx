'use client';

import { useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Clock, Heart } from 'lucide-react';
import { checkIn } from '@/app/actions';
import { milestoneContent } from '@/content/milestones';
import { verseById } from '@/content/scripture';

type Who = { id: string; name: string; isMe: boolean; today: boolean; yesterday: boolean };

type Props = {
  people: Who[];
  partnerJoined: boolean;
  journeyStarted: boolean;
  todayComplete: boolean;
  yesterdayOpen: boolean;
  yesterdayLabel: string;
  yesterdayDate: string; // YYYY-MM-DD on the couple's calendar
};

export function CheckInCard({
  people,
  partnerJoined,
  journeyStarted,
  todayComplete,
  yesterdayOpen,
  yesterdayLabel,
  yesterdayDate,
}: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const me = people.find((p) => p.isMe)!;
  const partner = people.find((p) => !p.isMe);

  function confirm(date?: string) {
    setError(null);
    start(async () => {
      const res = await checkIn(date);
      if (!res.ok) return setError(res.error);
      const newest = res.data?.unlocked.at(-1);
      if (newest) setCelebrate(newest);
    });
  }

  const content = celebrate ? milestoneContent(celebrate) : null;
  const verse = content ? verseById(content.verseId) : null;

  return (
    <section className="card" aria-labelledby="checkin-h">
      <h2 id="checkin-h" className="text-xl">Today</h2>

      <ul className="mt-3 space-y-2">
        {people.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3">
            <span className="font-medium">{p.isMe ? `${p.name} (you)` : p.name}</span>
            {p.today ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-forest">
                <Check className="h-4 w-4 text-sage" aria-hidden /> Confirmed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm text-forest/60">
                <Clock className="h-4 w-4" aria-hidden /> Not yet
              </span>
            )}
          </li>
        ))}
        {!partner && (
          <li className="rounded-2xl bg-cream px-4 py-3 text-sm text-forest/60">Waiting for your partner to join…</li>
        )}
      </ul>

      {todayComplete ? (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-sage-mist px-4 py-3 text-forest">
          <Heart className="h-5 w-5 text-terracotta" aria-hidden /> Today is walked — together. Well done.
        </p>
      ) : !partnerJoined ? null : !journeyStarted ? (
        <p className="mt-4 rounded-2xl bg-peach-soft px-4 py-3 text-sm text-forest">
          A fresh stretch of path begins tomorrow. Today, rest in God’s grace.
        </p>
      ) : me.today ? (
        <p className="mt-4 text-sm text-forest/70">
          You’ve confirmed. We’ll mark the day complete as soon as {partner?.name} does too.
        </p>
      ) : (
        <button className="btn-primary mt-4 w-full" onClick={() => confirm()} disabled={pending}>
          {pending ? 'Saving…' : 'I honoured our commitment today.'}
        </button>
      )}

      {yesterdayOpen && !me.yesterday && journeyStarted && partnerJoined && (
        <div className="mt-3 rounded-2xl border border-dashed border-forest/20 px-4 py-3">
          <p className="text-sm text-forest/70">
            Forgot to confirm {yesterdayLabel}? You can still do it today — it will be marked as a late
            confirmation. A missed day is never treated as a failure.
          </p>
          <button className="btn-quiet mt-2 min-h-10 text-sm" onClick={() => confirm(yesterdayDate)} disabled={pending}>
            Confirm {yesterdayLabel}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-peach-soft px-4 py-3 text-sm text-terracotta-deep">
          {error}
        </p>
      )}

      <AnimatePresence>
        {content && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 p-5 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="celebrate-h"
          >
            <motion.div
              className="w-full max-w-sm rounded-4xl bg-cream p-7 text-center shadow-lift"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 16 }}
            >
              <motion.div
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold text-3xl font-serif text-forest shadow-soft"
                initial={{ rotate: -12, scale: 0.6 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.15 }}
              >
                {celebrate}
              </motion.div>
              <h2 id="celebrate-h" className="mt-4 text-2xl">{content.place}</h2>
              <p className="mt-2 text-forest/75">{content.blurb}</p>
              {verse && (
                <p className="mt-4 text-sm italic text-forest/70">
                  “{verse.text}” <span className="not-italic">— {verse.reference}</span>
                </p>
              )}
              <p className="mt-4 text-sm text-forest/70">Your reward is unlocked. Choose it together in Milestones.</p>
              <button className="btn-primary mt-5 w-full" onClick={() => setCelebrate(null)} autoFocus>
                Keep walking
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
