'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { completeResetChallenge, reportReset } from '@/app/actions';
import { Pathway } from '@/components/Pathway';
import { RESET_CHALLENGES, RESET_MESSAGES } from '@/content/milestones';
import { verseForReset } from '@/content/scripture';

type Props = {
  walked: number;
  milestoneDays: number[];
  unlockedDays: number[];
  names: [string, string];
  resetCount: number;
};

export function ResetFlow({ walked, milestoneDays, unlockedDays, names, resetCount }: Props) {
  const [step, setStep] = useState<'reflect' | 'confirm' | 'done'>('reflect');
  const [reflection, setReflection] = useState('');
  const [challenge, setChallenge] = useState<string | null>(null);
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [challengeDone, setChallengeDone] = useState(false);
  const [shownWalked, setShownWalked] = useState(walked);
  const [pending, start] = useTransition();

  // Gentle return: the couple drifts back to the start of the path.
  useEffect(() => {
    if (step !== 'done') return;
    const id = setTimeout(() => setShownWalked(0), 700);
    return () => clearTimeout(id);
  }, [step]);

  function submit() {
    setError(null);
    start(async () => {
      const res = await reportReset({ confirmed: true, challenge, reflection: reflection.trim() });
      if (!res.ok) return setError(res.error);
      setResetId(res.data?.resetId ?? null);
      setStep('done');
    });
  }

  function markChallengeDone() {
    if (!resetId) return;
    start(async () => {
      const res = await completeResetChallenge(resetId);
      if (res.ok) setChallengeDone(true);
      else setError(res.error);
    });
  }

  const chosen = RESET_CHALLENGES.find((c) => c.id === challenge);
  const verse = verseForReset(resetCount + walked);

  if (step === 'done') {
    return (
      <div className="space-y-4">
        <div className="card overflow-hidden p-0">
          <Pathway walked={shownWalked} milestoneDays={milestoneDays} unlockedDays={unlockedDays} names={names} className="w-full" />
        </div>
        <section className="card">
          <h2 className="text-2xl">Back to the start of the path</h2>
          <p className="mt-2 text-forest/80">{RESET_MESSAGES[0]}</p>
          <p className="mt-2 text-forest/80">{RESET_MESSAGES[1]}</p>
          <blockquote className="mt-4 border-l-2 border-gold pl-4 font-serif text-lg leading-snug">
            “{verse.text}”
            <footer className="mt-1 font-sans text-sm text-forest/60">{verse.reference} · KJV</footer>
          </blockquote>
          <p className="mt-4 text-sm text-forest/70">{RESET_MESSAGES[2]} Your earned badges stay with you, and your lifetime progress is untouched.</p>
        </section>
        {chosen && (
          <section className="card">
            <h3 className="text-lg">Something to do together: {chosen.title}</h3>
            <p className="mt-1 text-forest/75">{chosen.body}</p>
            {challengeDone ? (
              <p className="mt-3 text-sm text-sage">Beautiful — marked as done.</p>
            ) : (
              <button className="btn-quiet mt-3" onClick={markChallengeDone} disabled={pending}>
                We did this
              </button>
            )}
            {error && <p role="alert" className="mt-2 text-sm text-terracotta-deep">{error}</p>}
          </section>
        )}
        <Link href="/" className="btn-primary w-full">Return to the path</Link>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <section className="card space-y-4">
        <h2 className="text-2xl">Before we begin again</h2>
        <p className="text-forest/80">
          This will end your current stretch of <strong>{walked} {walked === 1 ? 'day' : 'days'}</strong> for both
          of you, and you’ll return to the start of the path. A new stretch begins tomorrow.
        </p>
        <p className="text-sm text-forest/70">
          Your badges and lifetime progress are kept. Nothing about this changes how God sees you.
        </p>
        <label className="flex items-start gap-3 rounded-2xl bg-cream px-4 py-3">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-forest"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
          />
          <span className="text-sm">I understand, and we want to begin again.</span>
        </label>
        {error && <p role="alert" className="rounded-2xl bg-peach-soft px-4 py-3 text-sm text-terracotta-deep">{error}</p>}
        <div className="flex gap-3">
          <button className="btn-quiet flex-1" onClick={() => setStep('reflect')} disabled={pending}>Go back</button>
          <button className="btn-warm flex-1" onClick={submit} disabled={!understood || pending}>
            {pending ? 'Resetting…' : 'Begin again'}
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="card">
        <h2 className="text-2xl">Honesty is the first step</h2>
        <p className="mt-2 text-forest/80">
          Thank you for being truthful with each other and with God. This is serious, and it is not the end of
          your story — His mercies are new every morning.
        </p>
      </section>

      <section className="card">
        <label className="label" htmlFor="reflection">A private reflection (optional)</label>
        <p className="mb-2 text-xs text-forest/60">Only you can ever read this — not even your partner.</p>
        <textarea
          id="reflection"
          className="input min-h-28 py-3"
          maxLength={4000}
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="What happened, what you’re feeling, what you want to carry forward…"
        />
      </section>

      <fieldset className="card">
        <legend className="mb-2 px-1 font-serif text-lg">Choose something to do together</legend>
        <div className="space-y-2">
          {RESET_CHALLENGES.map((c) => (
            <label
              key={c.id}
              className={`block cursor-pointer rounded-2xl px-4 py-3 ring-1 transition ${
                challenge === c.id ? 'bg-sage-mist ring-sage' : 'bg-cream ring-forest/10'
              }`}
            >
              <input
                type="radio"
                name="challenge"
                className="sr-only"
                checked={challenge === c.id}
                onChange={() => setChallenge(c.id)}
              />
              <span className="font-medium">{c.title}</span>
              <span className="mt-0.5 block text-sm text-forest/70">{c.body}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-forest/60">An invitation to grow closer, never a punishment.</p>
      </fieldset>

      <div className="flex gap-3">
        <Link href="/" className="btn-quiet flex-1">Not now</Link>
        <button className="btn-primary flex-1" onClick={() => setStep('confirm')}>Continue</button>
      </div>
    </div>
  );
}
