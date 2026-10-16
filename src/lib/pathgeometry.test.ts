import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MILESTONE_DAYS } from './streak.ts';
import {
  PATH_VIEWBOX,
  couplePosition,
  pathD,
  pointOnPath,
  progressOnPath,
  segments,
  waypointsFor,
} from './pathgeometry.ts';

const days = DEFAULT_MILESTONE_DAYS;
const pts = waypointsFor(days.length);

test('one waypoint per milestone plus the start; climbing upward; ends at the cross', () => {
  assert.equal(pts.length, days.length + 1);
  for (let i = 1; i < pts.length; i++) assert.ok(pts[i].y < pts[i - 1].y, `waypoint ${i} is higher`);
  assert.equal(pts[pts.length - 1].x, PATH_VIEWBOX.width / 2);
  for (const p of pts) {
    assert.ok(p.x > 40 && p.x < PATH_VIEWBOX.width - 40, 'stays on screen horizontally');
    assert.ok(p.y > 40 && p.y < PATH_VIEWBOX.height - 40, 'stays on screen vertically');
  }
});

test('the path alternates sides so it winds', () => {
  const xs = pts.slice(0, -1).map((p) => p.x);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 120);
});

test('pathD builds one cubic per segment', () => {
  const d = pathD(pts);
  assert.ok(d.startsWith('M '));
  assert.equal((d.match(/C /g) ?? []).length, pts.length - 1);
  assert.equal(segments(pts).length, pts.length - 1);
});

test('progressOnPath: start, between milestones, exactly on one, and the summit', () => {
  assert.deepEqual(progressOnPath(0, days), { segment: 0, t: 0, fraction: 0 });
  const mid = progressOnPath(5, days); // between day 3 and day 7
  assert.equal(mid.segment, 1);
  assert.equal(mid.t, 0.5);
  const on = progressOnPath(7, days);
  assert.equal(on.segment, 2);
  assert.equal(on.t, 0);
  assert.deepEqual(progressOnPath(365, days), { segment: 10, t: 0, fraction: 1 });
  assert.deepEqual(progressOnPath(900, days), { segment: 10, t: 0, fraction: 1 });
});

test('progress is monotonic in days walked', () => {
  let prev = -1;
  for (let d = 0; d <= 400; d++) {
    const f = progressOnPath(d, days).fraction;
    assert.ok(f >= prev, `fraction never decreases (day ${d})`);
    prev = f;
  }
});

test('the couple stands exactly on a checkpoint when a milestone is reached', () => {
  days.forEach((d, i) => {
    const p = couplePosition(d, days, pts);
    assert.ok(Math.abs(p.x - pts[i + 1].x) < 0.01 && Math.abs(p.y - pts[i + 1].y) < 0.01, `day ${d}`);
  });
  const start = couplePosition(0, days, pts);
  assert.deepEqual(start, pts[0]);
});

test('positions between checkpoints move smoothly upward (no jumps)', () => {
  let prev = couplePosition(0, days, pts);
  for (let d = 1; d <= 365; d++) {
    const p = couplePosition(d, days, pts);
    assert.ok(Math.hypot(p.x - prev.x, p.y - prev.y) < 60, `no teleporting at day ${d}`);
    prev = p;
  }
});

test('custom milestones change the path length, not the rules', () => {
  const custom = [3, 10, 30];
  const p = waypointsFor(custom.length);
  assert.equal(p.length, 4);
  assert.deepEqual(couplePosition(10, custom, p), p[2]);
  assert.deepEqual(pointOnPath(p, 99, 0.5), p[p.length - 1]);
});
