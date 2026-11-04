/**
 * Core domain types. Names follow GLOSSARY.md — keep them in sync.
 *
 * Dates without a time are ISO "YYYY-MM-DD" strings (a "day key").
 * Instants are ISO-8601 strings with offset, e.g. "2026-11-04T17:00:00+01:00".
 */

/** Pastel colour a Family Member is shown in. Values map to CSS tokens `--color-member-<name>`. */
export const MEMBER_COLORS = [
  "peach",
  "sky",
  "lilac",
  "mint",
  "butter",
  "rose",
  "sage",
  "sand",
] as const;
export type MemberColor = (typeof MEMBER_COLORS)[number];

export type DayKey = string;

export interface Household {
  id: string;
  name: string;
  /** IANA time zone the Dashboard's "today" is computed in, e.g. "Europe/Stockholm". */
  timeZone: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  /** Text inside the brackets that assigns an Event to this Family Member, e.g. "Ella" for "[Ella] Soccer". */
  tag: string;
  color: MemberColor;
  /** Column order on the Dashboard, ascending. */
  position: number;
  isParent: boolean;
}

/**
 * An Event as read from a Calendar. Named `CalendarEvent` in code only to avoid
 * clashing with the DOM's global `Event` type; in conversation it is an "Event".
 */
export interface CalendarEvent {
  id: string;
  /** Raw title as written in the Calendar, Tags included. */
  title: string;
  allDay: boolean;
  /** Timed: ISO instant. All-day: day key. */
  start: string;
  /** Timed: ISO instant (exclusive). All-day: day key (exclusive), as Google Calendar returns it. */
  end: string;
}

export interface Task {
  id: string;
  memberId: string;
  title: string;
  dueDate: DayKey;
  /** ISO instant when it was ticked off, or null while open. */
  doneAt: string | null;
}

/** Everything a Screen needs to render the Dashboard, as sent by the server. */
export interface DashboardSnapshot {
  household: Household;
  members: FamilyMember[];
  events: CalendarEvent[];
  tasks: Task[];
  devices: import("@/devices/types").Device[];
  /** ISO instant the server produced this snapshot. */
  generatedAt: string;
  /** True when the server runs on built-in demo data. */
  demo: boolean;
}
