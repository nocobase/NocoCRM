// Business-time helpers with no imports, so the browser bundle can take
// them as well (the lead's follow-up card shows when its task will be
// planned, as the server plans it).

// The business time zone of a CRM whose settings name none and whose
// language names none either (defaultTimeZoneFor in schema.ts), and what the
// pages read until the settings have loaded: US Eastern time.
export const DEFAULT_TIME_ZONE = 'America/New_York';

// The offset of a zone at an instant, so the business day's end can be
// expressed as an instant without a calendar library.
export function zoneOffsetMinutes(timeZone: string, date: Date): number {
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value;
  const match = /GMT([+-])(\d{2}):?(\d{2})?/.exec(part ?? '');
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === '-' ? -minutes : minutes;
}

// When the first contact should happen: the business day `inDays` from now
// at ten, or, for today, the next full hour.
export function contactTime(
  inDays: number,
  timeZone: string,
  now = new Date(),
): Date {
  if (inDays <= 0) {
    const next = new Date(now);
    next.setUTCMinutes(0, 0, 0);
    next.setUTCHours(next.getUTCHours() + 1);
    return next;
  }
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now.getTime() + inDays * 86_400_000));
  const local = Date.parse(`${day}T10:00:00.000Z`);
  return new Date(local - zoneOffsetMinutes(timeZone, new Date(local)) * 60000);
}

// The end of the business day an instant falls on: where a task due on a
// date alone keeps its due time, so today's list, the overdue list and the
// order compare due times alike (a date-only task is overdue once its day
// is over).
// Whether a task's time is a date alone: the last instant of its business
// day, which no time of day picked to the minute can be.
export function isEndOfDay(at: Date, timeZone: string): boolean {
  return (
    Number.isFinite(at.getTime()) &&
    endOfDay(at, timeZone).getTime() === at.getTime()
  );
}

export function endOfDay(at: Date, timeZone: string): Date {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
  const local = Date.parse(`${day}T23:59:59.999Z`);
  return new Date(local - zoneOffsetMinutes(timeZone, new Date(local)) * 60000);
}
