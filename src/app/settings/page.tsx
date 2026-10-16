import { loadApp } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { pinLockConfigured } from '@/lib/pinlock';
import { pushConfigured } from '@/lib/push';
import { NotificationSettings } from '@/components/NotificationSettings';
import { PinSettings } from '@/components/PinForms';
import { Shell, SignOutButton } from '@/components/Shell';
import type { NotificationPrefs } from '@/app/actions';

export const dynamic = 'force-dynamic';

const DEFAULTS: NotificationPrefs = {
  evening_reminder: false,
  partner_checked_in: false,
  upcoming_milestone: false,
  milestone_celebration: false,
  scripture: false,
  reminder_hour: 20,
};

export default async function SettingsPage() {
  const app = await loadApp(); // also enforces the PIN lock
  const supabase = await createClient();
  const [{ data: profile }, { data: hasPin }] = await Promise.all([
    supabase.from('profiles').select('notification_prefs').eq('id', app.userId).single(),
    supabase.rpc('has_pin'),
  ]);
  const prefs = { ...DEFAULTS, ...((profile?.notification_prefs as Partial<NotificationPrefs>) ?? {}) };

  return (
    <Shell active="/settings">
      <h1 className="text-2xl">Settings</h1>
      <p className="mt-1 text-sm text-forest/65">Signed in as {app.me.name}.</p>

      <div className="mt-4 space-y-4">
        <section className="card">
          <h2 className="text-lg">Notifications</h2>
          <div className="mt-3">
            {pushConfigured() ? (
              <NotificationSettings initial={prefs} />
            ) : (
              <p className="text-sm text-forest/70">
                Notifications aren’t switched on for this server yet. Add the VAPID keys described in the README
                and redeploy.
              </p>
            )}
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg">PIN lock</h2>
          <div className="mt-3">
            <PinSettings hasPin={Boolean(hasPin)} configured={pinLockConfigured()} />
          </div>
        </section>

        <section className="card flex items-center justify-between">
          <span className="text-sm text-forest/70">Done for now?</span>
          <SignOutButton />
        </section>
      </div>
    </Shell>
  );
}
