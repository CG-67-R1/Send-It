import { localMidnightFromIso } from './eventIcs';

function localToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

export function isIsoDateTodayOrFuture(iso: string | null | undefined, now = new Date()): boolean {
  if (!iso) return true;
  return localMidnightFromIso(iso).getTime() >= localToday(now).getTime();
}

export function formatCalendarDateRange(start: string, end: string, locale: string): string {
  if (!start) return '';
  const startDate = localMidnightFromIso(start);
  const endDate = localMidnightFromIso(end || start);
  if (start === end) {
    return startDate.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const sameMonth =
    startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();
  if (sameMonth) {
    return `${startDate.getDate()}\u2013${endDate.getDate()} ${startDate.toLocaleDateString(locale, { month: 'short', year: 'numeric' })}`;
  }
  return `${startDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} \u2013 ${endDate.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
