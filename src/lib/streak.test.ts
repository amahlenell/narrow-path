import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarDays,
  completedDates,
  daysWalked,
  dayStatus,
  nextMilestone,
  normaliseMilestoneDays,
  reachedMilestones,
  sceneryStage,
  todayState,
  DEFAULT_MILESTONE_DAYS,
} from './streak.ts';
import type { CheckInRow, DayContext } from './streak.ts';

const AMY = 'amy';
const AARON = 'aaron';
const members = [AMY, AARON];
const both = (date: string): CheckInRow[] => [
  { userId: AMY, localDate: date },
  { userId: AARON, localDate: date },
];
const journey = { startedOn: '2026-10-01', endedOn: null };

test('a day only counts when BOTH partners have checked in', () => {
  const checkIns = [...both('2026-10-01'), { userId: AMY, localDate: '2026-10-02' }, ...both('2026-10-03')];
  assert.equal(daysWalked(journey, members, checkIns), 2);
  assert.deepEqual(completedDates(journey, members, checkIns), ['2026-10-01', '2026-10-03']);
});

test('duplicate rows for the same person do not complete a day', () => {
  const checkIns = [
    { userId: AMY, localDate: '2026-10-01' },
    { userId: AMY, localDate: '2026-10-01' },
  ];
  assert.equal(daysWalked(journey, members, checkIns), 0);
});

test('check-ins from outside the journey (before start / after end) are ignored', () => {
  const closed = { startedOn: '2026-10-05', endedOn: '2026-10-07' };
  const checkIns = [...both('2026-10-04'), ...both('2026-10-06'), ...both('2026-10-08')];
  assert.equal(daysWalked(closed, members, checkIns), 1);
});

test('people who are not members never count toward a day', () => {
  const checkIns = [
    { userId: AMY, localDate: '2026-10-01' },
    { userId: 'stranger', localDate: '2026-10-01' },
  ];
  assert.equal(daysWalked(journey, members, checkIns), 0);
});

test('missed days are never walked, but they do NOT reset or reduce the streak', () => {
  // walked 1st, 2nd, 3rd; nothing on 4th–8th
  const checkIns = [...both('2026-10-01'), ...both('2026-10-02'), ...both('2026-10-03')];
  assert.equal(daysWalked(journey, members, checkIns), 3);
  const ctx: DayContext = { today: '2026-10-09', journeys: [journey], members, checkIns };
  assert.equal(dayStatus('2026-10-05', ctx), 'missed');
  assert.equal(daysWalked(journey, members, checkIns), 3); // unchanged by the gap
});

test('dayStatus covers every state', () => {
  const checkIns = [
    ...both('2026-10-03'),
    { userId: AMY, localDate: '2026-10-05' }, // only Amy, window closed
    { userId: AMY, localDate: '2026-10-09' }, // only Amy, yesterday -> still open
  ];
  const ctx: DayContext = { today: '2026-10-10', journeys: [journey], members, checkIns };
  assert.equal(dayStatus('2026-10-03', ctx), 'completed');
  assert.equal(dayStatus('2026-10-04', ctx), 'missed');
  assert.equal(dayStatus('2026-10-05', ctx), 'partial');
  assert.equal(dayStatus('2026-10-09', ctx), 'open'); // yesterday is inside the grace window
  assert.equal(dayStatus('2026-10-10', ctx), 'open'); // today
  assert.equal(dayStatus('2026-10-11', ctx), 'future');
  assert.equal(dayStatus('2026-09-30', ctx), 'rest'); // before this journey
});

test('a completed day stays completed even inside the grace window', () => {
  const ctx: DayContext = { today: '2026-10-10', journeys: [journey], members, checkIns: both('2026-10-10') };
  assert.equal(dayStatus('2026-10-10', ctx), 'completed');
});

test('the day of a reset is marked as a reset day, and the next journey starts clean', () => {
  const first = { startedOn: '2026-10-01', endedOn: '2026-10-06' };
  const second = { startedOn: '2026-10-07', endedOn: null };
  const checkIns = [...both('2026-10-01'), ...both('2026-10-02'), ...both('2026-10-06'), ...both('2026-10-07')];
  const ctx: DayContext = { today: '2026-10-08', journeys: [first, second], members, checkIns };
  assert.equal(dayStatus('2026-10-06', ctx), 'reset');
  assert.equal(daysWalked(first, members, checkIns), 3);
  assert.equal(daysWalked(second, members, checkIns), 1);
});

test('calendarDays returns one entry per day with who checked in', () => {
  const checkIns = [...both('2026-10-01'), { userId: AMY, localDate: '2026-10-02' }];
  const ctx: DayContext = { today: '2026-10-05', journeys: [journey], members, checkIns };
  const days = calendarDays('2026-10-01', '2026-10-03', ctx);
  assert.equal(days.length, 3);
  assert.deepEqual(days[0].checkedIn.sort(), [AARON, AMY]);
  assert.deepEqual(days[1].checkedIn, [AMY]);
  assert.equal(days[1].status, 'partial');
});

test('todayState: who has checked in, and whether the day is complete', () => {
  const state = todayState({
    today: '2026-10-10',
    journey,
    members,
    checkIns: [{ userId: AMY, localDate: '2026-10-10' }],
  });
  assert.equal(state.journeyStarted, true);
  assert.deepEqual(state.today, { [AMY]: true, [AARON]: false });
  assert.equal(state.todayComplete, false);

  const done = todayState({ today: '2026-10-10', journey, members, checkIns: both('2026-10-10') });
  assert.equal(done.todayComplete, true);
});

test('todayState: yesterday stays open for a late check-in until it is complete', () => {
  const open = todayState({
    today: '2026-10-10',
    journey,
    members,
    checkIns: [{ userId: AMY, localDate: '2026-10-09' }],
  });
  assert.equal(open.yesterdayOpen, true);
  assert.deepEqual(open.yesterday, { [AMY]: true, [AARON]: false });

  const settled = todayState({ today: '2026-10-10', journey, members, checkIns: both('2026-10-09') });
  assert.equal(settled.yesterdayOpen, false);
});

test('todayState: yesterday is not offered if it was before the journey began', () => {
  const s = todayState({ today: '2026-10-01', journey, members, checkIns: [] });
  assert.equal(s.yesterdayOpen, false);
});

test('todayState: after a reset the new journey starts tomorrow', () => {
  const s = todayState({
    today: '2026-10-10',
    journey: { startedOn: '2026-10-11', endedOn: null },
    members,
    checkIns: [],
  });
  assert.equal(s.journeyStarted, false);
  assert.equal(s.yesterdayOpen, false);
});

test('milestones: next / reached / remaining', () => {
  const d = DEFAULT_MILESTONE_DAYS;
  assert.deepEqual(nextMilestone(0, d), { days: 3, remaining: 3 });
  assert.deepEqual(nextMilestone(3, d), { days: 7, remaining: 4 });
  assert.deepEqual(nextMilestone(99, d), { days: 100, remaining: 1 });
  assert.deepEqual(nextMilestone(100, d), { days: 180, remaining: 80 });
  assert.equal(nextMilestone(365, d), null);
  assert.deepEqual(reachedMilestones(0, d), []);
  assert.deepEqual(reachedMilestones(14, d), [3, 7, 14]);
  assert.deepEqual(reachedMilestones(1000, d).length, 10);
});

test('custom milestones are merged, de-duplicated and ordered', () => {
  assert.deepEqual(normaliseMilestoneDays([30, 10, 3, 10, -1, 2.5, 0]), [3, 10, 30]);
  assert.deepEqual(nextMilestone(4, [3, 10, 7]), { days: 7, remaining: 3 });
});

test('mirrors the database test: two earlier days + a late check-in unlocks the 3-day milestone', () => {
  const t = '2026-10-16';
  const checkIns = [
    ...both('2026-10-14'), // t-2: both
    { userId: AMY, localDate: '2026-10-15' }, // yesterday: Amy only
    { userId: AMY, localDate: t },
    { userId: AARON, localDate: t },
  ];
  const j = { startedOn: '2026-10-11', endedOn: null };
  assert.equal(daysWalked(j, members, checkIns), 2);
  const withLate = [...checkIns, { userId: AARON, localDate: '2026-10-15' }];
  assert.equal(daysWalked(j, members, withLate), 3);
  assert.deepEqual(reachedMilestones(3, DEFAULT_MILESTONE_DAYS), [3]);
});

test('scenery advances with the streak and never goes backwards', () => {
  assert.equal(sceneryStage(0), 0);
  assert.equal(sceneryStage(2), 0);
  assert.equal(sceneryStage(3), 1);
  assert.equal(sceneryStage(14), 2);
  assert.equal(sceneryStage(75), 4);
  assert.equal(sceneryStage(365), 5);
  let prev = 0;
  for (let d = 0; d <= 400; d++) {
    const s = sceneryStage(d);
    assert.ok(s >= prev);
    prev = s;
  }
});
