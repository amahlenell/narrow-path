import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';
import { sendPush, pushConfigured, type PushTarget } from '@/lib/push';
import { todayInZone } from '@/lib/dates';
import { daysWalked, isDayComplete, nextMilestone } from '@/lib/streak';
import { verseOfTheDay } from '@/content/scripture';
import { milestoneContent } from '@/content/milestones';

// Hit once an hour by a scheduler (see README). For every person whose
// chosen hour it is right now (on the couple's own clock), it sends the
// notifications they opted in to. Running more than once in an hour is safe
// for reminders because they're skipped once you've checked in; scripture
// and milestone notes use a fixed tag so a repeat just replaces the last.
//
// This is the ONLY place in the app that uses the service-role key, because
// no signed-in person is present when a scheduler calls it.

export const dynamic = 'force-dynamic';

const MORNING_HOUR = 8;

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = req.headers.get('authorization') ?? '';
  const want = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

function hourIn(tz: string, now: Date): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(now));
}

type Prefs = {
  evening_reminder?: boolean;
  upcoming_milestone?: boolean;
  scripture?: boolean;
  reminder_hour?: number;
};

export async function GET(req: NextRequest) {
  if (!authorised(req)) return new NextResponse('Unauthorized', { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !pushConfigured()) {
    return NextResponse.json({ error: 'Push or service-role key not configured' }, { status: 503 });
  }

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date();
  let sent = 0;
  const dead: string[] = [];

  const { data: couples } = await db.from('couples').select('id, timezone');
  for (const couple of couples ?? []) {
    const tz = (couple.timezone as string) || 'Pacific/Auckland';
    const today = todayInZone(now, tz);
    const hour = hourIn(tz, now);

    const [{ data: members }, { data: journeys }, { data: checkIns }, { data: milestones }] = await Promise.all([
      db.from('couple_members').select('user_id').eq('couple_id', couple.id),
      db.from('journeys').select('id, started_on, ended_on').eq('couple_id', couple.id).is('ended_on', null),
      db.from('check_ins').select('user_id, local_date').eq('couple_id', couple.id),
      db.from('milestones').select('days').eq('couple_id', couple.id),
    ]);
    const ids = (members ?? []).map((m) => m.user_id as string);
    if (ids.length < 2) continue;
    const journey = journeys?.[0];
    if (!journey || (journey.started_on as string) > today) continue;

    const rows = (checkIns ?? []).map((c) => ({ userId: c.user_id as string, localDate: c.local_date as string }));
    const walked = daysWalked({ startedOn: journey.started_on as string, endedOn: null }, ids, rows);
    const next = nextMilestone(walked, (milestones ?? []).map((m) => m.days as number));
    const dayDone = isDayComplete(today, ids, rows);

    const [{ data: profiles }, { data: subs }] = await Promise.all([
      db.from('profiles').select('id, notification_prefs').in('id', ids),
      db.from('push_subscriptions').select('user_id, endpoint, p256dh, auth').in('user_id', ids),
    ]);

    for (const id of ids) {
      const prefs = ((profiles ?? []).find((p) => p.id === id)?.notification_prefs ?? {}) as Prefs;
      const targets = (subs ?? []).filter((s) => s.user_id === id) as (PushTarget & { user_id: string })[];
      if (targets.length === 0) continue;
      const iCheckedIn = rows.some((r) => r.userId === id && r.localDate === today);

      const jobs: Promise<{ sent: number; gone: string[] }>[] = [];

      if (prefs.evening_reminder && hour === (prefs.reminder_hour ?? 20) && !iCheckedIn) {
        jobs.push(
          sendPush(targets, {
            title: 'A quiet moment for today',
            body: 'When you’re ready, confirm that you honoured your commitment.',
            tag: 'evening-reminder',
          }),
        );
      }
      if (prefs.scripture && hour === MORNING_HOUR) {
        const v = verseOfTheDay(today);
        jobs.push(sendPush(targets, { title: v.reference, body: v.text, url: '/growing', tag: 'scripture' }));
      }
      if (prefs.upcoming_milestone && hour === MORNING_HOUR && next?.remaining === 1 && !dayDone) {
        const place = milestoneContent(next.days)?.place ?? `day ${next.days}`;
        jobs.push(
          sendPush(targets, {
            title: 'A checkpoint is close',
            body: `One more day together brings you to ${place}.`,
            tag: 'upcoming-milestone',
          }),
        );
      }

      for (const r of await Promise.all(jobs)) {
        sent += r.sent;
        dead.push(...r.gone);
      }
    }
  }

  if (dead.length > 0) await db.from('push_subscriptions').delete().in('endpoint', dead);
  return NextResponse.json({ ok: true, sent, removed: dead.length });
}
