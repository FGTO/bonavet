import { describe, expect, it } from "vitest";
import { buildAgenda, eventDays, visibleTasks } from "./agenda";
import type { DashboardSnapshot, Task } from "./types";

const TZ = "Europe/Stockholm";
// Wednesday 4 Nov 2026, 08:00 in Stockholm (UTC+1).
const NOW = new Date("2026-11-04T07:00:00Z");

const snapshot = (overrides: Partial<DashboardSnapshot> = {}): DashboardSnapshot => ({
  household: { id: "h", name: "Test", timeZone: TZ },
  members: [
    { id: "oscar", name: "Oscar", tag: "Oscar", color: "sky", position: 2, isParent: false },
    { id: "ella", name: "Ella", tag: "Ella", color: "peach", position: 1, isParent: false },
  ],
  events: [],
  tasks: [],
  devices: [],
  generatedAt: NOW.toISOString(),
  demo: true,
  ...overrides,
});

describe("eventDays", () => {
  it("uses the household time zone, not UTC", () => {
    // 23:30 UTC on the 4th is 00:30 on the 5th in Stockholm.
    expect(
      eventDays({ id: "e", title: "", allDay: false, start: "2026-11-04T23:30:00Z", end: "2026-11-05T00:30:00Z" }, TZ),
    ).toEqual(["2026-11-05"]);
  });
  it("treats an all-day end date as exclusive", () => {
    expect(eventDays({ id: "e", title: "", allDay: true, start: "2026-11-04", end: "2026-11-06" }, TZ)).toEqual([
      "2026-11-04",
      "2026-11-05",
    ]);
  });
  it("does not spill a timed Event ending at midnight into the next day", () => {
    expect(
      eventDays(
        { id: "e", title: "", allDay: false, start: "2026-11-04T21:00:00+01:00", end: "2026-11-05T00:00:00+01:00" },
        TZ,
      ),
    ).toEqual(["2026-11-04"]);
  });
});

describe("buildAgenda", () => {
  it("shows today plus six days, columns in position order", () => {
    const agenda = buildAgenda(snapshot(), NOW);
    expect(agenda.today).toBe("2026-11-04");
    expect(agenda.days).toHaveLength(7);
    expect(agenda.days[6]).toBe("2026-11-10");
    expect(agenda.columns.map((c) => c.member.id)).toEqual(["ella", "oscar"]);
  });

  it("puts tagged Events in columns and the rest in the Household band", () => {
    const agenda = buildAgenda(
      snapshot({
        events: [
          { id: "1", title: "[Ella][Oscar] Dentist", allDay: false, start: "2026-11-05T09:00:00+01:00", end: "2026-11-05T10:00:00+01:00" },
          { id: "2", title: "Grandma visits", allDay: true, start: "2026-11-07", end: "2026-11-08" },
        ],
      }),
      NOW,
    );
    const ellaThu = agenda.columns[0].days[1];
    expect(ellaThu.events[0]).toMatchObject({ title: "Dentist", startLabel: "09:00", endLabel: "10:00" });
    expect(agenda.columns[1].days[1].events).toHaveLength(1);
    expect(agenda.household[3].events[0]).toMatchObject({ title: "Grandma visits", allDay: true });
  });

  it("sorts all-day Events first, then by start time", () => {
    const agenda = buildAgenda(
      snapshot({
        events: [
          { id: "late", title: "[Ella] Late", allDay: false, start: "2026-11-04T18:00:00+01:00", end: "2026-11-04T19:00:00+01:00" },
          { id: "early", title: "[Ella] Early", allDay: false, start: "2026-11-04T08:30:00+01:00", end: "2026-11-04T09:00:00+01:00" },
          { id: "allday", title: "[Ella] Trip", allDay: true, start: "2026-11-04", end: "2026-11-05" },
        ],
      }),
      NOW,
    );
    expect(agenda.columns[0].days[0].events.map((e) => e.id)).toEqual(["allday", "early", "late"]);
  });

  it("drops Events outside the window", () => {
    const agenda = buildAgenda(
      snapshot({
        events: [{ id: "x", title: "[Ella] Later", allDay: true, start: "2026-11-20", end: "2026-11-21" }],
      }),
      NOW,
    );
    expect(agenda.columns[0].days.every((d) => d.events.length === 0)).toBe(true);
  });

  it("shifts the window by the offset", () => {
    const agenda = buildAgenda(snapshot(), NOW, 7);
    expect(agenda.days[0]).toBe("2026-11-11");
    expect(agenda.household.some((d) => d.isToday)).toBe(false);
  });
});

describe("visibleTasks", () => {
  const task = (id: string, dueDate: string, done = false): Task => ({
    id,
    memberId: "ella",
    title: id,
    dueDate,
    doneAt: done ? "2026-11-03T10:00:00Z" : null,
  });
  const today = "2026-11-04";

  it("keeps overdue open Tasks, marked overdue and listed first", () => {
    const result = visibleTasks([task("due-fri", "2026-11-06"), task("late", "2026-11-02")], today, today, "2026-11-10");
    expect(result.map((t) => [t.id, t.status])).toEqual([
      ["late", "overdue"],
      ["due-fri", "open"],
    ]);
  });
  it("shows done Tasks until their due date has passed", () => {
    const result = visibleTasks([task("done-today", today, true), task("done-past", "2026-11-03", true)], today, today, "2026-11-10");
    expect(result.map((t) => [t.id, t.status])).toEqual([["done-today", "done"]]);
  });
  it("hides Tasks due after the window", () => {
    expect(visibleTasks([task("far", "2026-12-01")], today, today, "2026-11-10")).toEqual([]);
  });
  it("hides overdue Tasks when looking at a future window", () => {
    expect(visibleTasks([task("late", "2026-11-02")], today, "2026-11-11", "2026-11-17")).toEqual([]);
  });
});
