import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  daysUntil,
  diffDays,
  eachDay,
  endOfMonth,
  isValidDateString,
  startOfMonth,
  todayInZone,
  weekdayMondayFirst,
} from './dates.ts';

test('todayInZone: Auckland evening is the same calendar day', () => {
  // 19:06 NZDT on 16 Oct 2026 (UTC+13)
  assert.equal(todayInZone(new Date('2026-10-16T06:06:00Z')), '2026-10-16');
});

test('todayInZone: rolls over at Auckland midnight, not UTC midnight', () => {
  assert.equal(todayInZone(new Date('2026-10-16T10:59:59Z')), '2026-10-16'); // 23:59:59 NZDT
  assert.equal(todayInZone(new Date('2026-10-16T11:00:00Z')), '2026-10-17'); // 00:00:00 NZDT
  // Still the 16th in UTC, already the 17th in Auckland:
  assert.equal(todayInZone(new Date('2026-10-16T20:00:00Z')), '2026-10-17');
});

test('todayInZone: daylight saving starts (27 Sep 2026, a 23-hour day)', () => {
  assert.equal(todayInZone(new Date('2026-09-27T10:59:59Z')), '2026-09-27');
  assert.equal(todayInZone(new Date('2026-09-27T11:00:00Z')), '2026-09-28');
});

test('todayInZone: daylight saving ends (4 Apr 2027, a 25-hour day)', () => {
  assert.equal(todayInZone(new Date('2027-04-04T11:59:59Z')), '2027-04-04');
  assert.equal(todayInZone(new Date('2027-04-04T12:00:00Z')), '2027-04-05');
});

test('todayInZone: honours another zone when asked', () => {
  assert.equal(todayInZone(new Date('2026-10-16T06:06:00Z'), 'America/Los_Angeles'), '2026-10-15');
});

test('addDays crosses month, year and leap-day boundaries', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2027-02-28', 1), '2027-03-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2026-10-16', 0), '2026-10-16');
});

test('diffDays / daysUntil', () => {
  assert.equal(diffDays('2026-10-16', '2026-10-23'), 7);
  assert.equal(diffDays('2026-10-23', '2026-10-16'), -7);
  assert.equal(daysUntil('2027-06-12', '2026-10-16'), 239);
  assert.equal(daysUntil('2026-10-16', '2026-10-16'), 0);
});

test('eachDay is inclusive and empty when reversed', () => {
  assert.deepEqual(eachDay('2026-10-30', '2026-11-02'), ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  assert.deepEqual(eachDay('2026-10-02', '2026-10-01'), []);
});

test('month helpers and weekday', () => {
  assert.equal(startOfMonth('2026-10-16'), '2026-10-01');
  assert.equal(endOfMonth('2026-10-16'), '2026-10-31');
  assert.equal(endOfMonth('2028-02-10'), '2028-02-29');
  assert.equal(weekdayMondayFirst('2026-10-16'), 4); // Friday
  assert.equal(weekdayMondayFirst('2026-10-18'), 6); // Sunday
  assert.equal(weekdayMondayFirst('2026-10-19'), 0); // Monday
});

test('isValidDateString', () => {
  assert.equal(isValidDateString('2026-10-16'), true);
  assert.equal(isValidDateString('2026-02-30'), false);
  assert.equal(isValidDateString('16/10/2026'), false);
});
