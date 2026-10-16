'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  removePushSubscription,
  saveNotificationPrefs,
  savePushSubscription,
  sendTestPush,
  type NotificationPrefs,
} from '@/app/actions';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const OPTIONS: { key: keyof Omit<NotificationPrefs, 'reminder_hour'>; label: string; hint: string }[] = [
  { key: 'evening_reminder', label: 'Evening check-in reminder', hint: 'Only if you haven’t confirmed yet.' },
  { key: 'partner_checked_in', label: 'My partner checked in', hint: 'A gentle nudge when they’ve confirmed.' },
  { key: 'upcoming_milestone', label: 'A milestone is close', hint: 'The morning before a checkpoint.' },
  { key: 'milestone_celebration', label: 'Milestone reached', hint: 'When your partner’s check-in earns a checkpoint.' },
  { key: 'scripture', label: 'Morning scripture', hint: 'A verse for the day, around 8am.' },
];

type Support = 'checking' | 'unsupported' | 'needs-install' | 'ready';

export function NotificationSettings({ initial }: { initial: NotificationPrefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [support, setSupport] = useState<Support>('checking');
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const hasApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

    if (!hasApis) {
      // On iPhone, the push APIs only exist once the app is on the Home Screen.
      setSupport(isIOS && !standalone ? 'needs-install' : 'unsupported');
      return;
    }
    setSupport('ready');
    setPermission(Notification.permission);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {});
  }, []);

  function savePrefs(next: NotificationPrefs) {
    setPrefs(next);
    setError(null);
    start(async () => {
      const res = await saveNotificationPrefs(next);
      if (!res.ok) setError(res.error);
    });
  }

  function enable() {
    setError(null);
    setMessage(null);
    start(async () => {
      try {
        if (!VAPID_PUBLIC) throw new Error('Push isn’t set up on this server yet.');
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== 'granted') throw new Error('Notifications were not allowed. You can change this in your browser or phone settings.');
        const reg = await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
          }));
        const res = await savePushSubscription(sub.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } });
        if (!res.ok) throw new Error(res.error);
        setSubscribed(true);
        setMessage('Notifications are on for this device.');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  }

  function disable() {
    setError(null);
    setMessage(null);
    start(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await removePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
        setSubscribed(false);
        setMessage('Notifications are off for this device.');
      } catch {
        setError('Could not turn notifications off.');
      }
    });
  }

  function test() {
    setError(null);
    setMessage(null);
    start(async () => {
      const res = await sendTestPush();
      if (res.ok) setMessage('Sent! It should arrive in a moment.');
      else setError(res.error);
    });
  }

  if (support === 'checking') return <p className="text-sm text-forest/60">Checking this device…</p>;

  if (support === 'needs-install') {
    return (
      <p className="text-sm text-forest/75">
        On iPhone, notifications only work once The Narrow Path is on your Home Screen. Tap the Share button in
        Safari, choose <strong>Add to Home Screen</strong>, then open it from there and come back to this page.
      </p>
    );
  }
  if (support === 'unsupported') {
    return (
      <p className="text-sm text-forest/75">
        This browser doesn’t support web notifications. The app works fine without them; try Chrome, Edge,
        Firefox or Safari 16.4+ if you’d like reminders.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-forest/70">
        Notifications are always optional, and you choose them separately on each device.
      </p>

      {subscribed ? (
        <div className="flex gap-2">
          <button className="btn-quiet flex-1" onClick={test} disabled={pending}>Send a test</button>
          <button className="btn-quiet flex-1" onClick={disable} disabled={pending}>Turn off here</button>
        </div>
      ) : (
        <button className="btn-primary w-full" onClick={enable} disabled={pending || permission === 'denied'}>
          Turn on notifications on this device
        </button>
      )}
      {permission === 'denied' && (
        <p className="text-sm text-terracotta-deep">
          Notifications are blocked for this site. Allow them in your browser or phone settings, then try again.
        </p>
      )}

      <fieldset className="space-y-2" disabled={pending}>
        <legend className="sr-only">Which notifications</legend>
        {OPTIONS.map((o) => (
          <label key={o.key} className="flex items-start gap-3 rounded-2xl bg-cream px-4 py-3">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-forest"
              checked={prefs[o.key]}
              onChange={(e) => savePrefs({ ...prefs, [o.key]: e.target.checked })}
            />
            <span>
              <span className="block text-sm font-medium">{o.label}</span>
              <span className="block text-xs text-forest/60">{o.hint}</span>
            </span>
          </label>
        ))}
        <div className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3">
          <label htmlFor="hour" className="text-sm font-medium">Evening reminder time</label>
          <select
            id="hour"
            className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-forest/15"
            value={prefs.reminder_hour}
            onChange={(e) => savePrefs({ ...prefs, reminder_hour: Number(e.target.value) })}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {`${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'am' : 'pm'}`}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-forest/55">Times are in New Zealand time.</p>
      </fieldset>

      {message && <p role="status" className="text-sm text-sage">{message}</p>}
      {error && <p role="alert" className="rounded-2xl bg-peach-soft px-4 py-3 text-sm text-terracotta-deep">{error}</p>}
    </div>
  );
}
