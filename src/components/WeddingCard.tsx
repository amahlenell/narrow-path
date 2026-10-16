'use client';

import { useState, useTransition } from 'react';
import { setWeddingDate } from '@/app/actions';

type Props = { coupleId: string; weddingDate: string | null; daysUntil: number | null; prettyDate: string | null };

// No countdown unless a date has been chosen. Removing the date hides it again.
export function WeddingCard({ coupleId, weddingDate, daysUntil, prettyDate }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(weddingDate ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(date: string | null) {
    setError(null);
    start(async () => {
      const res = await setWeddingDate(coupleId, date);
      if (!res.ok) setError(res.error);
      else setEditing(false);
    });
  }

  return (
    <section className="card text-center" aria-label="Looking ahead">
      <p className="font-serif text-lg italic text-forest">
        Every day, we’re becoming the people we hope to be for one another.
      </p>

      {weddingDate && daysUntil !== null && !editing && (
        <p className="mt-3 text-sm text-forest/70">
          {daysUntil > 0
            ? `${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} until ${prettyDate}`
            : daysUntil === 0
              ? `Today is the day — ${prettyDate}`
              : `Your wedding day was ${prettyDate}`}
        </p>
      )}

      {editing ? (
        <div className="mt-4 space-y-3 text-left">
          <label className="label" htmlFor="wedding">Wedding date</label>
          <input id="wedding" type="date" className="input" value={value} onChange={(e) => setValue(e.target.value)} />
          {error && <p role="alert" className="text-sm text-terracotta-deep">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={pending || !value} onClick={() => save(value)}>Save</button>
            <button className="btn-quiet" onClick={() => setEditing(false)}>Cancel</button>
          </div>
          {weddingDate && (
            <button className="w-full text-sm text-forest/60 underline underline-offset-4" onClick={() => save(null)} disabled={pending}>
              Remove date and hide the countdown
            </button>
          )}
        </div>
      ) : (
        <button className="mt-3 text-sm text-forest/60 underline underline-offset-4" onClick={() => setEditing(true)}>
          {weddingDate ? 'Change wedding date' : 'We have a date — add it'}
        </button>
      )}
    </section>
  );
}
