/** All-day ICS for race events. Browser (iPhone Safari) opens this in Calendar. */

export type EventIcsInput = {
  title: string;
  startDate: string;
  endDate: string;
  location?: string;
  description?: string;
  uid?: string;
};

type Ymd = { y: number; m: number; d: number };

export function parseYmd(iso: string): Ymd {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (match) {
    return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
  }
  const dt = new Date(iso);
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
}

export function localMidnightFromIso(iso: string): Date {
  const { y, m, d } = parseYmd(iso);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function localEndOfDayFromIso(iso: string): Date {
  const { y, m, d } = parseYmd(iso);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatIcsDate(parts: Ymd): string {
  return `${parts.y}${pad2(parts.m)}${pad2(parts.d)}`;
}

/** ICS all-day DTEND is exclusive (day after the last included date). */
export function exclusiveEndDate(endIso: string): Ymd {
  const { y, m, d } = parseYmd(endIso);
  const next = new Date(y, m - 1, d + 1);
  return { y: next.getFullYear(), m: next.getMonth() + 1, d: next.getDate() };
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length) {
    chunks.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return chunks.join('\r\n');
}

function icsUtcStamp(now: Date): string {
  return (
    `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}` +
    `T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}Z`
  );
}

function slugFilename(title: string): string {
  const slug = title
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${slug || 'roadracer-event'}.ics`;
}

export function eventIcsFilename(title: string): string {
  return slugFilename(title);
}

export function buildEventIcs(input: EventIcsInput, now = new Date()): string {
  const uid = input.uid || `${Date.now()}@roadracer.app`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RoadRacer//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsUtcStamp(now)}`,
    `DTSTART;VALUE=DATE:${formatIcsDate(parseYmd(input.startDate))}`,
    `DTEND;VALUE=DATE:${formatIcsDate(exclusiveEndDate(input.endDate))}`,
    foldIcsLine(`SUMMARY:${escapeIcsText(input.title)}`),
  ];
  if (input.location) {
    lines.push(foldIcsLine(`LOCATION:${escapeIcsText(input.location)}`));
  }
  if (input.description) {
    lines.push(foldIcsLine(`DESCRIPTION:${escapeIcsText(input.description)}`));
  }
  lines.push(
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'TRIGGER:-P1D',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  );
  return `${lines.join('\r\n')}\r\n`;
}

/** Open/download an ICS from a user tap. iPhone Safari offers Add to Calendar. */
export function openEventIcsInBrowser(ics: string, filename: string): void {
  const win = typeof window !== 'undefined' ? window : null;
  const doc = typeof document !== 'undefined' ? document : null;
  if (!win || !doc?.body) {
    throw new Error('Calendar download is not available in this browser.');
  }
  const href = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
  const ua = win.navigator?.userAgent ?? '';
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (win.navigator.platform === 'MacIntel' && (win.navigator.maxTouchPoints ?? 0) > 1);

  // Safari ignores <a download> for calendar files; navigating opens Add to Calendar.
  if (isIos) {
    win.location.assign(href);
    return;
  }

  const a = doc.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  doc.body.appendChild(a);
  a.click();
  doc.body.removeChild(a);
}
