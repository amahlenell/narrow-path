'use client';

import { useActionState, useState } from 'react';
import { createCouple, joinCouple, signIn, signUp, type ActionResult } from '@/app/actions';

function Error({ state }: { state: ActionResult<unknown> | null }) {
  if (!state || state.ok) return null;
  return (
    <p role="alert" className="rounded-2xl bg-peach-soft px-4 py-3 text-sm text-terracotta-deep">
      {state.error}
    </p>
  );
}

export function AuthForm({ confirmFailed }: { confirmFailed?: boolean }) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [inState, inAction, inPending] = useActionState(signIn, null);
  const [upState, upAction, upPending] = useActionState(signUp, null);
  const state = mode === 'in' ? inState : upState;
  const pending = mode === 'in' ? inPending : upPending;

  if (mode === 'up' && upState?.ok && (upState.data as { needsConfirmation?: boolean } | undefined)?.needsConfirmation) {
    return (
      <div className="card text-center">
        <h2 className="text-2xl">Check your email</h2>
        <p className="mt-2 text-forest/70">
          We sent a confirmation link. Open it on this device, then come back and sign in.
        </p>
        <button className="btn-quiet mt-5" onClick={() => setMode('in')}>
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form action={mode === 'in' ? inAction : upAction} className="card space-y-4">
      {confirmFailed && (
        <p className="rounded-2xl bg-peach-soft px-4 py-3 text-sm text-terracotta-deep">
          That confirmation link didn’t work or has expired. Try signing in, or sign up again.
        </p>
      )}
      {mode === 'up' && (
        <div>
          <label className="label" htmlFor="display_name">What should your partner see as your name?</label>
          <input id="display_name" name="display_name" className="input" maxLength={40} required autoComplete="nickname" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
          minLength={mode === 'up' ? 10 : undefined}
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
        />
        {mode === 'up' && <p className="mt-1.5 text-xs text-forest/60">At least 10 characters.</p>}
      </div>
      <Error state={state} />
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create my account'}
      </button>
      <button
        type="button"
        className="w-full text-center text-sm text-forest/70 underline underline-offset-4"
        onClick={() => setMode(mode === 'in' ? 'up' : 'in')}
      >
        {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
    </form>
  );
}

export function SetupForms() {
  const [createState, createAction, creating] = useActionState(createCouple, null);
  const [joinState, joinAction, joining] = useActionState(joinCouple, null);
  return (
    <div className="space-y-5">
      <form action={createAction} className="card space-y-4">
        <h2 className="text-xl">Start your shared path</h2>
        <p className="text-sm text-forest/70">
          One of you begins here. You’ll get a one-time invite code to give to your partner.
        </p>
        <div>
          <label className="label" htmlFor="name">Name your path (optional)</label>
          <input id="name" name="name" className="input" maxLength={60} placeholder="Our Narrow Path" />
        </div>
        <Error state={createState} />
        <button className="btn-primary w-full" disabled={creating}>
          {creating ? 'Creating…' : 'Begin our path'}
        </button>
      </form>

      <form action={joinAction} className="card space-y-4">
        <h2 className="text-xl">Join your partner</h2>
        <p className="text-sm text-forest/70">Already have an invite code? Enter it here.</p>
        <div>
          <label className="label" htmlFor="code">Invite code</label>
          <input
            id="code"
            name="code"
            className="input font-mono uppercase tracking-widest"
            required
            autoCapitalize="characters"
            autoComplete="off"
          />
        </div>
        <Error state={joinState} />
        <button className="btn-warm w-full" disabled={joining}>
          {joining ? 'Joining…' : 'Join'}
        </button>
      </form>
    </div>
  );
}
