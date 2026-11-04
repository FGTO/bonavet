import { minutesOfDay } from "./time";

export interface QuietHoursSetting {
  /** "HH:MM" local time Quiet Hours begin. */
  start: string;
  /** "HH:MM" local time Quiet Hours end. May be earlier than start (wraps past midnight). */
  end: string;
}

/** v1 default; becomes a per-Household setting later. */
export const DEFAULT_QUIET_HOURS: QuietHoursSetting = { start: "22:00", end: "06:30" };

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function isQuietHours(now: Date, timeZone: string, setting = DEFAULT_QUIET_HOURS): boolean {
  const t = minutesOfDay(now, timeZone);
  const start = toMinutes(setting.start);
  const end = toMinutes(setting.end);
  if (start === end) return false;
  return start < end ? t >= start && t < end : t >= start || t < end;
}
