import type { DayKey } from "./types";

const dayKeyFormatters = new Map<string, Intl.DateTimeFormat>();
const clockFormatters = new Map<string, Intl.DateTimeFormat>();

function dayKeyFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = dayKeyFormatters.get(timeZone);
  if (!f) {
    // en-CA formats as YYYY-MM-DD.
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dayKeyFormatters.set(timeZone, f);
  }
  return f;
}

function clockFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = clockFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("sv-SE", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    clockFormatters.set(timeZone, f);
  }
  return f;
}

/** The calendar day an instant falls on in the given time zone. */
export function toDayKey(instant: Date, timeZone: string): DayKey {
  return dayKeyFormatter(timeZone).format(instant);
}

/** "17:05" in the given time zone. */
export function formatClock(instant: Date, timeZone: string): string {
  return clockFormatter(timeZone).format(instant);
}

/** Minutes since local midnight in the given time zone. */
export function minutesOfDay(instant: Date, timeZone: string): number {
  const [h, m] = formatClock(instant, timeZone).split(":").map(Number);
  return h * 60 + m;
}

export function addDays(day: DayKey, days: number): DayKey {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dayRange(first: DayKey, count: number): DayKey[] {
  return Array.from({ length: count }, (_, i) => addDays(first, i));
}

/** Weekday 0 (Monday) … 6 (Sunday) for a day key. */
export function weekdayIndex(day: DayKey): number {
  const js = new Date(`${day}T12:00:00Z`).getUTCDay();
  return (js + 6) % 7;
}

export function dayOfMonth(day: DayKey): number {
  return Number(day.slice(8, 10));
}

export function monthIndex(day: DayKey): number {
  return Number(day.slice(5, 7)) - 1;
}
