// Geometry for the illustrated pathway. The path is a smooth winding curve
// through one waypoint per checkpoint (start + each milestone). The couple's
// position is interpolated between waypoints according to days walked.

import { normaliseMilestoneDays } from './streak.ts';

export type Point = { x: number; y: number };

export const PATH_VIEWBOX = { width: 400, height: 640 } as const;

/** n milestones => n + 1 waypoints (start included), winding up the mountain. */
export function waypointsFor(milestoneCount: number): Point[] {
  const { width, height } = PATH_VIEWBOX;
  const bottom = height - 70;
  const top = 120;
  const cx = width / 2;
  const n = Math.max(1, milestoneCount);
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const y = bottom - u * (bottom - top);
    const swing = (1 - Math.pow(u, 3)) * 112; // settles toward the cross at the top
    const x = i === n ? cx : cx + Math.sin(i * 1.35 + 0.9) * swing;
    pts.push({ x: round(x), y: round(y) });
  }
  return pts;
}

const round = (v: number) => Math.round(v * 10) / 10;

type Cubic = { p0: Point; c1: Point; c2: Point; p1: Point };

/** Catmull-Rom spline expressed as one cubic Bézier per segment. */
export function segments(points: readonly Point[]): Cubic[] {
  const out: Cubic[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    out.push({
      p0: p1,
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      p1: p2,
    });
  }
  return out;
}

export function pathD(points: readonly Point[]): string {
  const segs = segments(points);
  if (segs.length === 0) return '';
  const f = (p: Point) => `${round(p.x)} ${round(p.y)}`;
  return (
    `M ${f(segs[0].p0)} ` + segs.map((s) => `C ${f(s.c1)}, ${f(s.c2)}, ${f(s.p1)}`).join(' ')
  );
}

function cubicAt(s: Cubic, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * s.p0.x + b * s.c1.x + c * s.c2.x + d * s.p1.x,
    y: a * s.p0.y + b * s.c1.y + c * s.c2.y + d * s.p1.y,
  };
}

/** Position `t` (0..1) of the way along segment `index`. */
export function pointOnPath(points: readonly Point[], index: number, t: number): Point {
  const segs = segments(points);
  if (segs.length === 0) return points[0];
  if (index >= segs.length) return points[points.length - 1];
  return cubicAt(segs[Math.max(0, index)], Math.min(1, Math.max(0, t)));
}

/**
 * Where along the path is a couple who has walked `walked` days?
 * Waypoint 0 is the start (0 days); waypoint i is the i-th milestone.
 */
export function progressOnPath(
  walked: number,
  milestoneDays: readonly number[],
): { segment: number; t: number; fraction: number } {
  const days = [0, ...normaliseMilestoneDays(milestoneDays)];
  const n = days.length - 1;
  if (n <= 0) return { segment: 0, t: 0, fraction: 0 };
  if (walked >= days[n]) return { segment: n, t: 0, fraction: 1 };
  let i = 0;
  while (i < n - 1 && walked >= days[i + 1]) i++;
  const t = (Math.max(0, walked) - days[i]) / (days[i + 1] - days[i]);
  return { segment: i, t, fraction: (i + t) / n };
}

export function couplePosition(
  walked: number,
  milestoneDays: readonly number[],
  points: readonly Point[],
): Point {
  const { segment, t } = progressOnPath(walked, milestoneDays);
  return pointOnPath(points, segment, t);
}
