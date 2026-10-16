'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { after } from 'next/server';
import { sendPush, type PushTarget } from '@/lib/push';
import { milestoneContent } from '@/content/milestones';
import { createClient } from '@/lib/supabase/server';
import { friendlyError } from '@/lib/errors';
import { grantUnlock, pinLockConfigured, revokeUnlock } from '@/lib/pinlock';

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const fail = (message?: string | null): { ok: false; error: string } => ({
  ok: false,
  error: friendlyError(message),
});

async function siteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

// ---- auth -----------------------------------------------------------------

export async function signIn(_: unknown, form: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get('email') ?? '').trim(),
    password: String(form.get('password') ?? ''),
  });
  if (error) return { ok: false, error: 'That email and password do not match.' };
  redirect('/');
}

export async function signUp(_: unknown, form: FormData): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const password = String(form.get('password') ?? '');
  if (password.length < 10) return { ok: false, error: 'Please choose a password of at least 10 characters.' };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get('email') ?? '').trim(),
    password,
    options: {
      data: { display_name: String(form.get('display_name') ?? '').trim().slice(0, 40) },
      emailRedirectTo: `${await siteUrl()}/auth/callback`,
    },
  });
  if (error) return { ok: false, error: 'We could not create that account. Try a different email or password.' };
  if (data.session) redirect('/');
  return { ok: true, data: { needsConfirmation: true } };
}

export async function signOut() {
  await revokeUnlock();
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// ---- couple ----------------------------------------------------------------

export async function createCouple(_: unknown, form: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('create_couple', { p_name: String(form.get('name') ?? '') || null });
  if (error) return fail(error.message);
  redirect('/');
}

export async function joinCouple(_: unknown, form: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('join_couple', { p_code: String(form.get('code') ?? '') });
  if (error) return fail(error.message);
  redirect('/');
}

// ---- walking ---------------------------------------------------------------

export async function checkIn(date?: string): Promise<ActionResult<{ unlocked: number[]; already: boolean }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('check_in', { p_date: date ?? null });
  if (error) return fail(error.message);
  revalidatePath('/', 'layout');

  const unlocked = (data?.newly_unlocked as number[]) ?? [];
  const already = Boolean(data?.already_checked_in);

  // Tell the partner (only if they opted in). Runs after the response is sent
  // and can never make the check-in fail.
  if (!already) {
    after(async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { data: me } = user
          ? await supabase.from('profiles').select('display_name').eq('id', user.id).single()
          : { data: null };
        const name = (me?.display_name as string) || 'Your partner';

        const { data: t1 } = await supabase.rpc('partner_push_targets', { p_kind: 'partner_checked_in' });
        await sendPush((t1 ?? []) as PushTarget[], {
          title: `${name} honoured today`,
          body: 'Your turn, whenever you’re ready.',
          tag: 'partner-checked-in',
        });

        const newest = unlocked.at(-1);
        if (newest) {
          const place = milestoneContent(newest)?.place ?? `Day ${newest}`;
          const { data: t2 } = await supabase.rpc('partner_push_targets', { p_kind: 'milestone_celebration' });
          await sendPush((t2 ?? []) as PushTarget[], {
            title: `You reached ${place}`,
            body: `${newest} days walked together. Come and choose your reward.`,
            url: '/milestones',
            tag: 'milestone',
          });
        }
      } catch {
        /* notifications are best-effort */
      }
    });
  }
  return { ok: true, data: { unlocked, already } };
}

export async function reportReset(input: {
  confirmed: boolean;
  challenge: string | null;
  reflection: string;
}): Promise<ActionResult<{ resetId: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('report_reset', {
    p_confirm: input.confirmed,
    p_challenge: input.challenge,
    p_reflection: input.reflection || null,
  });
  if (error) return fail(error.message);
  revalidatePath('/', 'layout');
  return { ok: true, data: { resetId: data as string } };
}

export async function completeResetChallenge(resetId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('complete_reset_challenge', { p_reset_id: resetId });
  if (error) return fail(error.message);
  revalidatePath('/', 'layout');
  return { ok: true };
}

// ---- rewards ---------------------------------------------------------------

export async function suggestReward(milestoneId: string, body: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('suggest_reward', { p_milestone_id: milestoneId, p_body: body });
  if (error) return fail(error.message);
  revalidatePath('/milestones');
  return { ok: true };
}

export async function voteReward(suggestionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('vote_reward', { p_suggestion_id: suggestionId });
  if (error) return fail(error.message);
  revalidatePath('/milestones');
  return { ok: true };
}

// ---- prayer intentions -------------------------------------------------------

export async function addPrayer(coupleId: string, userId: string, body: string): Promise<ActionResult> {
  const text = body.trim();
  if (!text) return { ok: false, error: 'Write a few words to pray about.' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('prayer_intentions')
    .insert({ couple_id: coupleId, author_id: userId, body: text.slice(0, 500) });
  if (error) return { ok: false, error: 'Could not save that prayer.' };
  revalidatePath('/growing');
  return { ok: true };
}

export async function setPrayerAnswered(id: string, answered: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('prayer_intentions')
    .update({ answered_at: answered ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) return { ok: false, error: 'Could not update that prayer.' };
  revalidatePath('/growing');
  return { ok: true };
}

export async function deletePrayer(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from('prayer_intentions').delete().eq('id', id);
  if (error) return { ok: false, error: 'Could not remove that prayer.' };
  revalidatePath('/growing');
  return { ok: true };
}

export async function setWeddingDate(coupleId: string, date: string | null): Promise<ActionResult> {
  if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: 'Please choose a valid date.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('couples').update({ wedding_date: date }).eq('id', coupleId);
  if (error) return { ok: false, error: 'Could not save that date.' };
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function addCustomMilestone(
  coupleId: string,
  days: number,
  title: string,
): Promise<ActionResult> {
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    return { ok: false, error: 'Choose a number of days between 1 and 3650.' };
  }
  if (!title.trim()) return { ok: false, error: 'Give your milestone a name.' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('milestones')
    .insert({ couple_id: coupleId, days, title: title.trim().slice(0, 80), is_custom: true });
  if (error) {
    return {
      ok: false,
      error: error.code === '23505' ? 'You already have a milestone at that day.' : 'Could not add that milestone.',
    };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

// ---- PIN lock -----------------------------------------------------------------

const PIN_RE = /^([0-9]{4}|[0-9]{6})$/;

export async function unlockWithPin(_: unknown, form: FormData): Promise<ActionResult> {
  const pin = String(form.get('pin') ?? '');
  if (!PIN_RE.test(pin)) return { ok: false, error: 'Enter your 4 or 6 digit PIN.' };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data, error } = await supabase.rpc('verify_pin', { p_pin: pin });
  if (error) {
    return error.message.includes('pin_locked')
      ? { ok: false, error: 'Too many wrong tries. Please wait 15 minutes and try again.' }
      : fail(error.message);
  }
  if (!data) return { ok: false, error: 'That PIN isn’t right.' };
  await grantUnlock(user.id);
  redirect('/');
}

export async function savePin(_: unknown, form: FormData): Promise<ActionResult<{ saved: true }>> {
  if (!pinLockConfigured()) {
    return { ok: false, error: 'The PIN lock needs PIN_COOKIE_SECRET to be set on the server (see README).' };
  }
  const next = String(form.get('pin') ?? '');
  const confirm = String(form.get('confirm') ?? '');
  const current = String(form.get('current') ?? '');
  if (!PIN_RE.test(next)) return { ok: false, error: 'A PIN must be exactly 4 or 6 digits.' };
  if (next !== confirm) return { ok: false, error: 'The two PINs don’t match.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: hasPin } = await supabase.rpc('has_pin');
  if (hasPin) {
    const { data: ok, error } = await supabase.rpc('verify_pin', { p_pin: current });
    if (error?.message.includes('pin_locked')) return { ok: false, error: 'Too many wrong tries. Please wait 15 minutes.' };
    if (error || !ok) return { ok: false, error: 'Your current PIN isn’t right.' };
  }
  const { error } = await supabase.rpc('set_pin', { p_pin: next });
  if (error) return { ok: false, error: 'Could not save your PIN.' };
  await grantUnlock(user.id);
  revalidatePath('/settings');
  return { ok: true, data: { saved: true } };
}

export async function removePin(_: unknown, form: FormData): Promise<ActionResult<{ removed: true }>> {
  const supabase = await createClient();
  const { data: ok, error } = await supabase.rpc('verify_pin', { p_pin: String(form.get('current') ?? '') });
  if (error?.message.includes('pin_locked')) return { ok: false, error: 'Too many wrong tries. Please wait 15 minutes.' };
  if (error || !ok) return { ok: false, error: 'Your current PIN isn’t right.' };
  const { error: clearErr } = await supabase.rpc('clear_pin');
  if (clearErr) return { ok: false, error: 'Could not remove your PIN.' };
  await revokeUnlock();
  revalidatePath('/settings');
  return { ok: true, data: { removed: true } };
}

export async function lockNow() {
  await revokeUnlock();
  redirect('/lock');
}

// ---- notifications -----------------------------------------------------------

export type NotificationPrefs = {
  evening_reminder: boolean;
  partner_checked_in: boolean;
  upcoming_milestone: boolean;
  milestone_celebration: boolean;
  scripture: boolean;
  reminder_hour: number;
};

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<ActionResult> {
  const hour = Number(prefs.reminder_hour);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return { ok: false, error: 'Choose an hour between 0 and 23.' };
  const clean: NotificationPrefs = {
    evening_reminder: Boolean(prefs.evening_reminder),
    partner_checked_in: Boolean(prefs.partner_checked_in),
    upcoming_milestone: Boolean(prefs.upcoming_milestone),
    milestone_celebration: Boolean(prefs.milestone_celebration),
    scripture: Boolean(prefs.scripture),
    reminder_hour: hour,
  };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase.from('profiles').update({ notification_prefs: clean }).eq('id', user.id);
  if (error) return { ok: false, error: 'Could not save your preferences.' };
  revalidatePath('/settings');
  return { ok: true };
}

export async function savePushSubscription(sub: {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
}): Promise<ActionResult> {
  const supabase = await createClient();
  const ua = (await headers()).get('user-agent');
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: sub.keys?.p256dh ?? '',
    p_auth: sub.keys?.auth ?? '',
    p_user_agent: ua,
  });
  if (error) return { ok: false, error: 'Could not turn on notifications for this device.' };
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('remove_push_subscription', { p_endpoint: endpoint });
  if (error) return { ok: false, error: 'Could not turn off notifications for this device.' };
  return { ok: true };
}

/** Sends a test notification to the signed-in person's own devices. */
export async function sendTestPush(): Promise<ActionResult<{ sent: number }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth');
  if (error) return { ok: false, error: 'Could not read your devices.' };
  const { sent } = await sendPush((data ?? []) as PushTarget[], {
    title: 'The Narrow Path',
    body: 'Notifications are working. Walking with you.',
    tag: 'test',
  });
  if (sent === 0) {
    return { ok: false, error: 'Nothing was delivered. Check that push is set up on the server and this device is subscribed.' };
  }
  return { ok: true, data: { sent } };
}
