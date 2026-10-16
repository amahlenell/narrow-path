'use client';

import { useState, useTransition } from 'react';
import { Check, Lock, ThumbsUp } from 'lucide-react';
import { addCustomMilestone, suggestReward, voteReward } from '@/app/actions';
import type { MilestoneRow, Suggestion } from '@/lib/data';
import { milestoneContent } from '@/content/milestones';
import { verseById } from '@/content/scripture';

type Props = {
  coupleId: string;
  userId: string;
  walked: number;
  milestones: MilestoneRow[];
  unlockedDays: number[];
  suggestions: Suggestion[];
};

function MilestoneCard({
  m,
  earned,
  walked,
  suggestions,
  userId,
}: {
  m: MilestoneRow;
  earned: boolean;
  walked: number;
  suggestions: Suggestion[];
  userId: string;
}) {
  const content = milestoneContent(m.days);
  const verse = content ? verseById(content.verseId) : null;
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const chosen = suggestions.find((s) => s.id === m.chosenSuggestionId);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? 'Something went wrong.');
      else after?.();
    });
  }

  return (
    <li className={`card ${earned ? 'ring-gold/50' : ''}`}>
      <div className="flex items-start gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-serif text-xl ${
            earned ? 'bg-gold text-forest shadow-soft' : 'bg-cream-deep text-forest/50'
          }`}
          aria-hidden
        >
          {earned ? m.days : <Lock className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg leading-tight">{m.title ?? content?.place ?? `Day ${m.days}`}</h3>
          <p className="text-sm text-forest/60">
            Day {m.days}
            {earned ? ' · earned' : ` · ${Math.max(m.days - walked, 0)} to go`}
          </p>
        </div>
      </div>

      <p className="mt-3 text-forest/80">{m.note ?? content?.blurb}</p>
      {verse && (
        <p className="mt-2 text-sm italic text-forest/65">
          “{verse.text}” <span className="not-italic">— {verse.reference}</span>
        </p>
      )}

      <div className="mt-4 rounded-2xl bg-cream px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-widest text-sage">Reward</p>
        {chosen ? (
          <p className="mt-1 flex items-center gap-2 font-medium">
            <Check className="h-4 w-4 text-sage" aria-hidden /> {chosen.body}
            {earned && <span className="rounded-full bg-gold-soft px-2 py-0.5 text-xs">unlocked</span>}
          </p>
        ) : (
          <p className="mt-1 text-sm text-forest/65">
            Not chosen yet. Suggest ideas, then each of you back the one you love — when you both pick the same one, it’s yours.
            Nothing is ever bought for you.
          </p>
        )}

        {suggestions.length > 0 && (
          <ul className="mt-3 space-y-2">
            {suggestions.map((s) => {
              const mine = s.votes.includes(userId);
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    {s.body} <span className="text-forest/50">· {s.by}</span>
                  </span>
                  <button
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 ring-1 ${
                      mine ? 'bg-sage-mist ring-sage' : 'ring-forest/15'
                    }`}
                    aria-pressed={mine}
                    disabled={pending}
                    onClick={() => run(() => voteReward(s.id))}
                  >
                    <ThumbsUp className="h-4 w-4" aria-hidden /> {s.votes.length}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            run(() => suggestReward(m.id, text), () => setText(''));
          }}
        >
          <input
            className="input min-h-10 flex-1 text-sm"
            value={text}
            maxLength={200}
            onChange={(e) => setText(e.target.value)}
            placeholder="Suggest a reward…"
            aria-label={`Suggest a reward for day ${m.days}`}
          />
          <button className="btn-quiet min-h-10 px-4 text-sm" disabled={pending || !text.trim()}>Add</button>
        </form>

        {content && content.rewardIdeas.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {content.rewardIdeas.map((idea) => (
              <button
                key={idea}
                type="button"
                className="rounded-full bg-white px-3 py-1.5 text-xs ring-1 ring-forest/10 hover:ring-sage"
                onClick={() => setText(idea)}
              >
                {idea}
              </button>
            ))}
          </div>
        )}
        {error && <p role="alert" className="mt-2 text-sm text-terracotta-deep">{error}</p>}
      </div>
    </li>
  );
}

export function MilestoneList({ coupleId, userId, walked, milestones, unlockedDays, suggestions }: Props) {
  const [days, setDays] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <ul className="space-y-4">
        {milestones.map((m) => (
          <MilestoneCard
            key={m.id}
            m={m}
            walked={walked}
            earned={unlockedDays.includes(m.days)}
            userId={userId}
            suggestions={suggestions.filter((s) => s.milestoneId === m.id)}
          />
        ))}
      </ul>

      <form
        className="card mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const res = await addCustomMilestone(coupleId, Number(days), title);
            if (!res.ok) setError(res.error);
            else {
              setDays('');
              setTitle('');
            }
          });
        }}
      >
        <h2 className="text-lg">Add your own milestone</h2>
        <div className="flex gap-2">
          <input
            className="input w-24"
            type="number"
            min={1}
            max={3650}
            inputMode="numeric"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="Day"
            aria-label="Day number"
            required
          />
          <input
            className="input flex-1"
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Our anniversary"
            aria-label="Milestone name"
            required
          />
        </div>
        {error && <p role="alert" className="text-sm text-terracotta-deep">{error}</p>}
        <button className="btn-primary w-full" disabled={pending}>Add milestone</button>
      </form>
    </>
  );
}
