// Calendar-day helpers. Everything in the app that is "a day" is a plain
// YYYY-MM-DD string on the couple's own calendar (Pacific/Auckland), never a
// timestamp — that keeps daylight-saving shifts and device clocks out of it.

export const COUPLE_TIMEZONE = 'Pacific/Auckland';

/** 'YYYY-MM-DD' */
export type DateString = string;

/** The calendar date it currently is in `timeZone` (defaults to Auckland). */
export function todayInZone(now: Date, timeZone: string = COUPLE_TIMEZONE): DateString {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function toUtcMs(date: DateString): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = toUtcMs(value);
  return new Date(ms).toISOString().slice(0, 10) === value;
}

export function addDays(date: DateString, n: number): DateString {
  return new Date(toUtcMs(date) + n * 86_400_000).toISOString().slice(0, 10);
}

/** Whole days from a to b (positive when b is later). */
export function diffDays(a: DateString, b: DateString): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / 86_400_000);
}

/** Inclusive list of dates from `from` to `to`. Empty when `to` < `from`. */
export function eachDay(from: DateString, to: DateString): DateString[] {
  const out: DateString[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function startOfMonth(date: DateString): DateString {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: DateString): DateString {
  const [y, m] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday (calendar grids start on Monday). */
export function weekdayMondayFirst(date: DateString): number {
  return (new Date(toUtcMs(date)).getUTCDay() + 6) % 7;
}

export function formatDate(
  date: DateString,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' },
): string {
  return new Intl.DateTimeFormat('en-NZ', { ...options, timeZone: 'UTC' }).format(
    new Date(toUtcMs(date)),
  );
}

/** Whole days from today until `target`; 0 on the day itself, negative once past. */
export function daysUntil(target: DateString, today: DateString): number {
  return diffDays(today, target);
}
