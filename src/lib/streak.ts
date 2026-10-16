// Core tracking rules. Pure functions only — no database, no clock — so they
// can be tested exhaustively. The Postgres functions in
// supabase/migrations/0001_init.sql enforce the same rules on the server;
// this module is what the UI uses to *display* them.
//
// Rules:
//  * A day is "completed" only when EVERY member has checked in for it.
//  * The shared streak ("days walked") is the number of completed days in the
//    current journey.
//  * A missed day never resets anything and is never assumed to be misconduct.
//    It simply isn't walked. Only an explicit, confirmed reset starts over.
//  * Either partner may confirm today, or yesterday (a one-day grace window,
//    flagged "late"), so a forgotten tap isn't a crisis.

import { addDays, eachDay } from './dates.ts';
import type { DateString } from './dates.ts';

export const LATE_WINDOW_DAYS = 1;
export const DEFAULT_MILESTONE_DAYS = [3, 7, 14, 21, 30, 50, 75, 100, 180, 365] as const;

export type CheckInRow = { userId: string; localDate: DateString };
export type JourneyRange = { startedOn: DateString; endedOn?: DateString | null };

export type DayStatus =
  | 'completed' // everyone checked in
  | 'open' // today, or yesterday still inside the grace window
  | 'partial' // some (not all) checked in and the window has closed
  | 'missed' // nobody checked in and the window has closed
  | 'future'
  | 'reset' // the day a journey was reset
  | 'rest'; // not part of any journey

type Members = readonly string[];

function checkedInOn(date: DateString, members: Members, checkIns: readonly CheckInRow[]): string[] {
  const who = new Set<string>();
  for (const c of checkIns) {
    if (c.localDate === date && members.includes(c.userId)) who.add(c.userId);
  }
  return [...who];
}

export function isDayComplete(
  date: DateString,
  members: Members,
  checkIns: readonly CheckInRow[],
): boolean {
  return members.length > 0 && checkedInOn(date, members, checkIns).length === members.length;
}

function inRange(date: DateString, j: JourneyRange): boolean {
  return date >= j.startedOn && (j.endedOn == null || date <= j.endedOn);
}

/** Dates (within the journey) that both partners confirmed, oldest first. */
export function completedDates(
  journey: JourneyRange,
  members: Members,
  checkIns: readonly CheckInRow[],
): DateString[] {
  const dates = new Set(checkIns.filter((c) => inRange(c.localDate, journey)).map((c) => c.localDate));
  return [...dates].filter((d) => isDayComplete(d, members, checkIns)).sort();
}

/** The shared streak: how many days the couple has walked this journey. */
export function daysWalked(
  journey: JourneyRange,
  members: Members,
  checkIns: readonly CheckInRow[],
): number {
  return completedDates(journey, members, checkIns).length;
}

export type DayContext = {
  today: DateString;
  journeys: readonly JourneyRange[];
  members: Members;
  checkIns: readonly CheckInRow[];
};

export function dayStatus(date: DateString, ctx: DayContext): DayStatus {
  const journey = ctx.journeys.find((j) => inRange(date, j));
  if (!journey) return 'rest';
  if (date > ctx.today) return 'future';
  if (journey.endedOn != null && date === journey.endedOn) return 'reset';
  if (isDayComplete(date, ctx.members, ctx.checkIns)) return 'completed';
  if (date >= addDays(ctx.today, -LATE_WINDOW_DAYS)) return 'open';
  return checkedInOn(date, ctx.members, ctx.checkIns).length > 0 ? 'partial' : 'missed';
}

/** One entry per day from `from` to `to`, for the calendar history. */
export function calendarDays(
  from: DateString,
  to: DateString,
  ctx: DayContext,
): { date: DateString; status: DayStatus; checkedIn: string[] }[] {
  return eachDay(from, to).map((date) => ({
    date,
    status: dayStatus(date, ctx),
    checkedIn: checkedInOn(date, ctx.members, ctx.checkIns),
  }));
}

export type TodayState = {
  journeyStarted: boolean;
  /** userId -> has confirmed today */
  today: Record<string, boolean>;
  todayComplete: boolean;
  /** Yesterday can still be confirmed (grace window) and isn't complete yet. */
  yesterdayOpen: boolean;
  yesterday: Record<string, boolean>;
  yesterdayDate: DateString;
};

export function todayState(ctx: {
  today: DateString;
  journey: JourneyRange;
  members: Members;
  checkIns: readonly CheckInRow[];
}): TodayState {
  const { today, journey, members, checkIns } = ctx;
  const yesterdayDate = addDays(today, -1);
  const todayWho = checkedInOn(today, members, checkIns);
  const yWho = checkedInOn(yesterdayDate, members, checkIns);
  const started = journey.startedOn <= today;
  return {
    journeyStarted: started,
    today: Object.fromEntries(members.map((m) => [m, todayWho.includes(m)])),
    todayComplete: members.length > 0 && todayWho.length === members.length,
    yesterday: Object.fromEntries(members.map((m) => [m, yWho.includes(m)])),
    yesterdayDate,
    yesterdayOpen:
      started &&
      yesterdayDate >= journey.startedOn &&
      !(members.length > 0 && yWho.length === members.length),
  };
}

// ---- milestones -----------------------------------------------------------

export function normaliseMilestoneDays(days: readonly number[]): number[] {
  return [...new Set(days.filter((d) => Number.isInteger(d) && d > 0))].sort((a, b) => a - b);
}

export function reachedMilestones(walked: number, milestoneDays: readonly number[]): number[] {
  return normaliseMilestoneDays(milestoneDays).filter((d) => d <= walked);
}

export function nextMilestone(
  walked: number,
  milestoneDays: readonly number[],
): { days: number; remaining: number } | null {
  const next = normaliseMilestoneDays(milestoneDays).find((d) => d > walked);
  return next === undefined ? null : { days: next, remaining: next - walked };
}

/** 0..5 — which stretch of scenery the couple is walking through. */
export const SCENERY_THRESHOLDS = [0, 3, 14, 30, 75, 180] as const;
export function sceneryStage(walked: number): number {
  let stage = 0;
  SCENERY_THRESHOLDS.forEach((t, i) => {
    if (walked >= t) stage = i;
  });
  return stage;
}
