import { addDays, dayOfMonth, monthIndex, weekdayIndex } from "@/domain/time";
import type { DayKey } from "@/domain/types";
import { t, type MessageKey } from ".";

const weekday = (day: DayKey) => t(`weekday.${weekdayIndex(day)}` as MessageKey);
const weekdayShort = (day: DayKey) => t(`weekdayShort.${weekdayIndex(day)}` as MessageKey);
const month = (day: DayKey) => t(`month.${monthIndex(day)}` as MessageKey);

/** "Onsdag 4 november" */
export function longDate(day: DayKey): string {
  return `${weekday(day)} ${dayOfMonth(day)} ${month(day)}`;
}

/** "Idag", "Imorgon", else "Fre 6 nov". */
export function dayHeading(day: DayKey, today: DayKey): string {
  if (day === today) return t("day.today");
  if (day === addDays(today, 1)) return t("day.tomorrow");
  return `${weekdayShort(day)} ${dayOfMonth(day)} ${month(day).slice(0, 3)}`;
}

/** "idag", "till fre", "till fre 13 nov" (when more than a week away). */
export function dueLabel(due: DayKey, today: DayKey): string {
  if (due === today) return t("dashboard.dueToday");
  const short = weekdayShort(due).toLowerCase();
  const day = due > addDays(today, 6) ? `${short} ${dayOfMonth(due)} ${month(due).slice(0, 3)}` : short;
  return t("dashboard.dueOn", { day });
}
