// Business-time helpers with no imports, so the browser bundle can take
// them as well (the lead's follow-up card shows when its activity will be
// planned, as the server plans it).

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
