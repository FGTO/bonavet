import { assignEvent } from "./tags";
import { addDays, dayRange, formatClock, toDayKey } from "./time";
import type { CalendarEvent, DashboardSnapshot, DayKey, FamilyMember, Task } from "./types";

/** How many days the Dashboard shows: today plus the next six. */
export const WINDOW_DAYS = 7;

export interface AgendaEvent {
  id: string;
  title: string;
  allDay: boolean;
  /** "17:00" for timed Events, null for all-day. */
  startLabel: string | null;
  /** "18:30" when the Event ends on the same day, else null. */
  endLabel: string | null;
  /** True if the Event started on an earlier day (multi-day continuation). */
  continues: boolean;
  /** Sort key: all-day first, then by start time. */
  sortKey: string;
}

export type TaskStatus = "overdue" | "open" | "done";

export interface AgendaTask {
  id: string;
  title: string;
  dueDate: DayKey;
  status: TaskStatus;
}

export interface AgendaDay {
  day: DayKey;
  isToday: boolean;
  events: AgendaEvent[];
}

export interface AgendaColumn {
  member: FamilyMember;
  tasks: AgendaTask[];
  days: AgendaDay[];
}

export interface Agenda {
  today: DayKey;
  days: DayKey[];
  /** Household Events per day (Events with no recognised Tag). */
  household: AgendaDay[];
  columns: AgendaColumn[];
}

/** The days a single Event occupies, in the household's time zone. */
export function eventDays(event: CalendarEvent, timeZone: string): DayKey[] {
  if (event.allDay) {
    const days: DayKey[] = [];
    // End is exclusive for all-day Events. Guard against malformed data.
    for (let d = event.start; d < event.end || days.length === 0; d = addDays(d, 1)) {
      days.push(d);
      if (days.length > 366) break;
    }
    return days;
  }
  const start = new Date(event.start);
  // End is exclusive: an Event ending exactly at midnight does not occupy the next day.
  const endInclusive = new Date(Math.max(start.getTime(), new Date(event.end).getTime() - 1));
  const first = toDayKey(start, timeZone);
  const last = toDayKey(endInclusive, timeZone);
  const days: DayKey[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) {
    days.push(d);
    if (days.length > 366) break;
  }
  return days;
}

function toAgendaEvent(
  event: CalendarEvent,
  title: string,
  day: DayKey,
  timeZone: string,
): AgendaEvent {
  if (event.allDay) {
    return {
      id: event.id,
      title,
      allDay: true,
      startLabel: null,
      endLabel: null,
      continues: day !== event.start,
      sortKey: `0`,
    };
  }
  const start = new Date(event.start);
  const end = new Date(event.end);
  const startDay = toDayKey(start, timeZone);
  const endDay = toDayKey(new Date(end.getTime() - 1), timeZone);
  const continues = day !== startDay;
  const startLabel = continues ? null : formatClock(start, timeZone);
  const endLabel = endDay === day && end.getTime() > start.getTime() ? formatClock(end, timeZone) : null;
  return {
    id: event.id,
    title,
    allDay: false,
    startLabel,
    endLabel,
    continues,
    sortKey: `1${continues ? "00:00" : startLabel}`,
  };
}

function byEventOrder(a: AgendaEvent, b: AgendaEvent): number {
  return a.sortKey.localeCompare(b.sortKey) || a.title.localeCompare(b.title, "sv-SE");
}

/**
 * Which Tasks a column shows, given the visible window:
 * - open Tasks due inside the window, plus overdue ones when the window starts today;
 * - done Tasks until their due date has passed.
 */
export function visibleTasks(tasks: Task[], today: DayKey, firstDay: DayKey, lastDay: DayKey): AgendaTask[] {
  const result: AgendaTask[] = [];
  for (const task of tasks) {
    const done = task.doneAt !== null;
    const overdue = !done && task.dueDate < today;
    if (done && task.dueDate < today) continue;
    if (task.dueDate > lastDay) continue;
    if (task.dueDate < firstDay && !(overdue && firstDay === today)) continue;
    result.push({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      status: done ? "done" : overdue ? "overdue" : "open",
    });
  }
  const rank: Record<TaskStatus, number> = { overdue: 0, open: 1, done: 2 };
  return result.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      a.dueDate.localeCompare(b.dueDate) ||
      a.title.localeCompare(b.title, "sv-SE"),
  );
}

/**
 * Turns a snapshot into what the Dashboard draws: one column per Family Member
 * plus the Household band, for `WINDOW_DAYS` days starting `offsetDays` from today.
 */
export function buildAgenda(snapshot: DashboardSnapshot, now: Date, offsetDays = 0): Agenda {
  const { timeZone } = snapshot.household;
  const today = toDayKey(now, timeZone);
  const firstDay = addDays(today, offsetDays);
  const days = dayRange(firstDay, WINDOW_DAYS);
  const lastDay = days[days.length - 1];
  const members = [...snapshot.members].sort((a, b) => a.position - b.position);

  const emptyDays = (): Map<DayKey, AgendaEvent[]> => new Map(days.map((d) => [d, []]));
  const household = emptyDays();
  const perMember = new Map(members.map((m) => [m.id, emptyDays()]));

  for (const event of snapshot.events) {
    const { memberIds, displayTitle } = assignEvent(event.title, members);
    for (const day of eventDays(event, timeZone)) {
      if (day < firstDay || day > lastDay) continue;
      const item = toAgendaEvent(event, displayTitle, day, timeZone);
      if (memberIds.length === 0) {
        household.get(day)!.push(item);
      } else {
        for (const id of memberIds) perMember.get(id)?.get(day)!.push(item);
      }
    }
  }

  const toDays = (map: Map<DayKey, AgendaEvent[]>): AgendaDay[] =>
    days.map((day) => ({ day, isToday: day === today, events: map.get(day)!.sort(byEventOrder) }));

  return {
    today,
    days,
    household: toDays(household),
    columns: members.map((member) => ({
      member,
      tasks: visibleTasks(
        snapshot.tasks.filter((t) => t.memberId === member.id),
        today,
        firstDay,
        lastDay,
      ),
      days: toDays(perMember.get(member.id)!),
    })),
  };
}
