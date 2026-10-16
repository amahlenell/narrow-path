'use client';

import { useActionState } from 'react';
import { lockNow, removePin, savePin, unlockWithPin, type ActionResult } from '@/app/actions';

function Msg({ state, okText }: { state: ActionResult<unknown> | null; okText?: string }) {
  if (!state) return null;
  if (state.ok) return okText ? <p role="status" className="text-sm text-sage">{okText}</p> : null;
  return <p role="alert" className="rounded-2xl bg-peach-soft px-4 py-3 text-sm text-terracotta-deep">{state.error}</p>;
}

const pinProps = {
  type: 'password',
  inputMode: 'numeric' as const,
  pattern: '[0-9]*',
  maxLength: 6,
  autoComplete: 'off',
  required: true,
};

export function LockForm() {
  const [state, action, pending] = useActionState(unlockWithPin, null);
  return (
    <form action={action} className="space-y-4">
      <label className="sr-only" htmlFor="pin">PIN</label>
      <input
        id="pin"
        name="pin"
        {...pinProps}
        className="input text-center font-mono text-2xl tracking-[0.5em]"
        autoFocus
        aria-describedby="pin-help"
      />
      <p id="pin-help" className="sr-only">Four or six digits</p>
      <Msg state={state} />
      <button className="btn-primary w-full" disabled={pending}>{pending ? 'Checking…' : 'Unlock'}</button>
    </form>
  );
}

export function PinSettings({ hasPin, configured }: { hasPin: boolean; configured: boolean }) {
  const [saveState, saveAction, saving] = useActionState(savePin, null);
  const [removeState, removeAction, removing] = useActionState(removePin, null);

  if (!configured) {
    return (
      <p className="text-sm text-forest/70">
        The PIN lock isn’t switched on for this server yet. Set <code>PIN_COOKIE_SECRET</code> (32+ random
        characters) in your environment, as described in the README.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-forest/70">
        An extra lock for this app on your devices. It sits on top of your account password, which still
        protects your data. After 5 wrong tries the PIN pauses for 15 minutes.
      </p>

      <form action={saveAction} className="space-y-3">
        {hasPin && (
          <div>
            <label className="label" htmlFor="current">Current PIN</label>
            <input id="current" name="current" {...pinProps} className="input font-mono tracking-[0.4em]" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="pin-new">{hasPin ? 'New PIN' : 'Choose a PIN (4 or 6 digits)'}</label>
          <input id="pin-new" name="pin" {...pinProps} className="input font-mono tracking-[0.4em]" />
        </div>
        <div>
          <label className="label" htmlFor="pin-confirm">Confirm PIN</label>
          <input id="pin-confirm" name="confirm" {...pinProps} className="input font-mono tracking-[0.4em]" />
        </div>
        <Msg state={saveState} okText="PIN saved." />
        <button className="btn-primary w-full" disabled={saving}>{saving ? 'Saving…' : hasPin ? 'Change PIN' : 'Turn on PIN lock'}</button>
      </form>

      {hasPin && (
        <>
          <form action={lockNow}>
            <button className="btn-quiet w-full">Lock the app now</button>
          </form>
          <form action={removeAction} className="space-y-3 border-t border-forest/10 pt-4">
            <label className="label" htmlFor="remove-current">Turn the PIN lock off</label>
            <input id="remove-current" name="current" {...pinProps} className="input font-mono tracking-[0.4em]" placeholder="Current PIN" />
            <Msg state={removeState} okText="PIN removed." />
            <button className="btn-quiet w-full" disabled={removing}>Remove PIN</button>
          </form>
        </>
      )}
    </div>
  );
}
