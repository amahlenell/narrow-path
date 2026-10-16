'use client';

import { useState, useTransition } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { addPrayer, deletePrayer, setPrayerAnswered } from '@/app/actions';

export type Prayer = { id: string; body: string; byMe: boolean; authorName: string; answered: boolean };

export function PrayerList({ coupleId, userId, prayers }: { coupleId: string; userId: string; prayers: Prayer[] }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? 'Something went wrong.');
      else after?.();
    });
  };

  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addPrayer(coupleId, userId, text), () => setText(''));
        }}
      >
        <input
          className="input flex-1"
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          placeholder="Something we’re praying about…"
          aria-label="New prayer intention"
        />
        <button className="btn-primary px-5" disabled={pending || !text.trim()}>Add</button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-terracotta-deep">{error}</p>}

      {prayers.length === 0 ? (
        <p className="mt-3 text-sm text-forest/60">Nothing yet. Add the first thing you’d like to bring to God together.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {prayers.map((p) => (
            <li key={p.id} className={`flex items-start gap-3 rounded-2xl px-4 py-3 ${p.answered ? 'bg-sage-mist' : 'bg-cream'}`}>
              <button
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ${
                  p.answered ? 'bg-sage text-white ring-sage' : 'ring-forest/25'
                }`}
                aria-label={p.answered ? 'Mark as not yet answered' : 'Mark as answered'}
                aria-pressed={p.answered}
                disabled={pending}
                onClick={() => run(() => setPrayerAnswered(p.id, !p.answered))}
              >
                {p.answered && <Check className="h-4 w-4" aria-hidden />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={p.answered ? 'text-forest/70 line-through decoration-sage/60' : ''}>{p.body}</p>
                <p className="text-xs text-forest/50">{p.byMe ? 'You' : p.authorName}{p.answered && ' · answered'}</p>
              </div>
              {p.byMe && (
                <button
                  className="p-2 text-forest/40 hover:text-terracotta"
                  aria-label="Remove this prayer"
                  disabled={pending}
                  onClick={() => run(() => deletePrayer(p.id))}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
