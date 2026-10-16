import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isUnlocked } from '@/lib/pinlock';
import { COUPLE_TIMEZONE, todayInZone } from '@/lib/dates';
import type { DateString } from '@/lib/dates';
import {
  daysWalked,
  isDayComplete,
  nextMilestone,
  type CheckInRow,
  type JourneyRange,
} from '@/lib/streak';

export type Person = { id: string; name: string; isMe: boolean };
export type MilestoneRow = {
  id: string;
  days: number;
  title: string | null;
  note: string | null;
  isCustom: boolean;
  chosenSuggestionId: string | null;
};
export type Suggestion = { id: string; milestoneId: string; body: string; by: string; votes: string[] };
export type ResetRow = {
  id: string;
  localDate: DateString;
  daysWalked: number;
  challenge: string | null;
  challengeCompletedAt: string | null;
  initiatedBy: string;
};

export type AppData = {
  userId: string;
  coupleId: string;
  coupleName: string;
  inviteCode: string;
  inviteActive: boolean;
  weddingDate: string | null;
  today: DateString;
  people: Person[];
  me: Person;
  partner: Person | null;
  journeys: (JourneyRange & { id: string })[];
  current: JourneyRange & { id: string };
  checkIns: CheckInRow[];
  walked: number;
  milestones: MilestoneRow[];
  milestoneDays: number[];
  unlockedDays: number[]; // ever earned, across journeys
  next: { days: number; remaining: number } | null;
  suggestions: Suggestion[];
  resets: ResetRow[];
  stats: { lifetimeDays: number; longest: number; resets: number };
};

/** Everything the signed-in person is allowed to see, loaded through RLS. */
export async function loadApp(): Promise<AppData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Optional PIN lock: if this person set a PIN, they must have unlocked
  // recently on this device.
  const { data: hasPin } = await supabase.rpc('has_pin');
  if (hasPin && !(await isUnlocked(user.id))) redirect('/lock');

  const { data: membership } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership) redirect('/setup');
  const cid = membership.couple_id as string;

  const [couple, members, journeys, checkIns, milestones, unlocks, suggestions, votes, resets] =
    await Promise.all([
      supabase.from('couples').select('*').eq('id', cid).single(),
      supabase.from('couple_members').select('user_id').eq('couple_id', cid),
      supabase.from('journeys').select('*').eq('couple_id', cid).order('started_on'),
      supabase.from('check_ins').select('user_id, local_date').eq('couple_id', cid),
      supabase.from('milestones').select('*').eq('couple_id', cid).order('days'),
      supabase.from('milestone_unlocks').select('milestone_id').eq('couple_id', cid),
      supabase.from('reward_suggestions').select('*').eq('couple_id', cid).order('created_at'),
      supabase.from('reward_votes').select('suggestion_id, user_id'),
      supabase.from('resets').select('*').eq('couple_id', cid).order('local_date', { ascending: false }),
    ]);

  if (couple.error || !couple.data) redirect('/setup');

  const ids = (members.data ?? []).map((m) => m.user_id as string);
  const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', ids);
  const nameOf = (id: string) => profiles?.find((p) => p.id === id)?.display_name || 'Beloved';
  const people: Person[] = ids.map((id) => ({ id, name: nameOf(id), isMe: id === user.id }));
  const me = people.find((p) => p.isMe)!;
  const partner = people.find((p) => !p.isMe) ?? null;

  const tz = (couple.data.timezone as string) || COUPLE_TIMEZONE;
  const today = todayInZone(new Date(), tz);

  const journeyRows = (journeys.data ?? []).map((j) => ({
    id: j.id as string,
    startedOn: j.started_on as string,
    endedOn: (j.ended_on as string | null) ?? null,
  }));
  const current = journeyRows.find((j) => j.endedOn === null) ?? journeyRows[journeyRows.length - 1];

  const rows: CheckInRow[] = (checkIns.data ?? []).map((c) => ({
    userId: c.user_id as string,
    localDate: c.local_date as string,
  }));

  const milestoneRows: MilestoneRow[] = (milestones.data ?? []).map((m) => ({
    id: m.id as string,
    days: m.days as number,
    title: m.title as string | null,
    note: m.note as string | null,
    isCustom: m.is_custom as boolean,
    chosenSuggestionId: m.chosen_suggestion_id as string | null,
  }));
  const milestoneDays = milestoneRows.map((m) => m.days);
  const unlockedIds = new Set((unlocks.data ?? []).map((u) => u.milestone_id as string));

  const walked = daysWalked(current, ids, rows);

  const sugg: Suggestion[] = (suggestions.data ?? []).map((s) => ({
    id: s.id as string,
    milestoneId: s.milestone_id as string,
    body: s.body as string,
    by: nameOf(s.suggested_by as string),
    votes: (votes.data ?? []).filter((v) => v.suggestion_id === s.id).map((v) => v.user_id as string),
  }));

  const resetRows: ResetRow[] = (resets.data ?? []).map((r) => ({
    id: r.id as string,
    localDate: r.local_date as string,
    daysWalked: r.days_walked as number,
    challenge: r.challenge as string | null,
    challengeCompletedAt: r.challenge_completed_at as string | null,
    initiatedBy: nameOf(r.initiated_by as string),
  }));

  // Lifetime stats are separate from the current streak.
  const lifetimeDays = new Set(rows.map((r) => r.localDate).filter((d) => isDayComplete(d, ids, rows))).size;
  const longest = Math.max(walked, ...resetRows.map((r) => r.daysWalked), 0);

  return {
    userId: user.id,
    coupleId: cid,
    coupleName: couple.data.name as string,
    inviteCode: couple.data.invite_code as string,
    inviteActive: new Date(couple.data.invite_expires_at as string) > new Date(),
    weddingDate: (couple.data.wedding_date as string | null) ?? null,
    today,
    people,
    me,
    partner,
    journeys: journeyRows,
    current,
    checkIns: rows,
    walked,
    milestones: milestoneRows,
    milestoneDays,
    unlockedDays: milestoneRows.filter((m) => unlockedIds.has(m.id)).map((m) => m.days),
    next: nextMilestone(walked, milestoneDays),
    suggestions: sugg,
    resets: resetRows,
    stats: { lifetimeDays, longest, resets: resetRows.length },
  };
}
