import "server-only";
import { addDays, toDayKey } from "@/domain/time";
import type { CalendarEvent, DashboardSnapshot, FamilyMember, Task } from "@/domain/types";

export const DEMO_HOUSEHOLD_ID = "demo";
const TZ = "Europe/Stockholm";

const members: FamilyMember[] = [
  { id: "m-anna", name: "Anna", tag: "Anna", color: "rose", position: 0, isParent: true },
  { id: "m-jonas", name: "Jonas", tag: "Jonas", color: "sage", position: 1, isParent: true },
  { id: "m-ella", name: "Ella", tag: "Ella", color: "peach", position: 2, isParent: false },
  { id: "m-oscar", name: "Oscar", tag: "Oscar", color: "sky", position: 3, isParent: false },
];

/** "HH:MM" on `day` in Stockholm as an ISO instant (offset computed, DST-safe). */
function at(day: string, hhmm: string): string {
  const guess = new Date(`${day}T${hhmm}:00Z`);
  const local = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(guess);
  const [h, m] = local.split(":").map(Number);
  const [wantH, wantM] = hhmm.split(":").map(Number);
  let offsetMin = h * 60 + m - (wantH * 60 + wantM);
  if (offsetMin > 720) offsetMin -= 1440; // local clock wrapped past midnight
  if (offsetMin < -720) offsetMin += 1440;
  return new Date(guess.getTime() - offsetMin * 60_000).toISOString();
}

function demoEvents(today: string): CalendarEvent[] {
  const d = (n: number) => addDays(today, n);
  const timed = (id: string, day: string, from: string, to: string, title: string): CalendarEvent => ({
    id,
    title,
    allDay: false,
    start: at(day, from),
    end: at(day, to),
  });
  return [
    timed("e1", d(0), "17:00", "18:15", "[Ella] Fotbollsträning"),
    timed("e2", d(0), "18:00", "19:00", "[Oscar] Körrepetition"),
    timed("e3", d(0), "09:00", "10:00", "[Anna] Möte med skolan"),
    timed("e4", d(0), "12:00", "12:30", "[Jonas] Ring tandläkaren"),
    timed("e5", d(1), "08:15", "09:00", "[Ella][Oscar] Tandläkare"),
    timed("e6", d(1), "16:30", "17:30", "[Oscar] Simskola"),
    timed("e7", d(2), "17:00", "18:15", "[Ella] Fotbollsträning"),
    timed("e8", d(2), "19:00", "21:00", "[Jonas] Innebandy"),
    { id: "e9", title: "Mormor och morfar hälsar på", allDay: true, start: d(3), end: d(5) },
    timed("e10", d(3), "18:00", "20:00", "Middag hos grannarna"),
    timed("e11", d(4), "10:00", "11:30", "[Ella] Match mot IFK"),
    timed("e12", d(4), "14:00", "16:00", "[Oscar] Kalas hos Leo"),
    timed("e13", d(5), "09:30", "10:30", "[Anna] Löprunda med Sara"),
    { id: "e14", title: "[Oscar] Friluftsdag", allDay: true, start: d(6), end: d(7) },
    timed("e15", d(6), "18:30", "19:30", "[Elal] Gitarrlektion"), // Tag typo → Household band
  ];
}

/** Demo Task state lives in memory so ticking one off on the Dashboard sticks until restart. */
const taskDone = new Map<string, string | null>();

function demoTasks(today: string): Task[] {
  const task = (id: string, memberId: string, title: string, due: number, done = false): Task => {
    if (!taskDone.has(id)) taskDone.set(id, done ? new Date().toISOString() : null);
    return { id, memberId, title, dueDate: addDays(today, due), doneAt: taskDone.get(id) ?? null };
  };
  return [
    task("t1", "m-ella", "Matteläxa s. 42–43", 1),
    task("t2", "m-ella", "Läsa kapitel 3", -1),
    task("t3", "m-oscar", "Packa gympakläder", 0, true),
    task("t4", "m-oscar", "Glosor engelska", 2),
    task("t5", "m-jonas", "Betala skolresan", 3),
    task("t6", "m-anna", "Anmäla till utvecklingssamtal", 5),
  ];
}

export function toggleDemoTask(taskId: string): boolean {
  if (!taskDone.has(taskId)) return false;
  taskDone.set(taskId, taskDone.get(taskId) ? null : new Date().toISOString());
  return true;
}

export function getDemoSnapshot(now = new Date()): Omit<DashboardSnapshot, "devices"> {
  const today = toDayKey(now, TZ);
  return {
    household: { id: DEMO_HOUSEHOLD_ID, name: "Familjen Demo", timeZone: TZ },
    members,
    events: demoEvents(today),
    tasks: demoTasks(today),
    generatedAt: now.toISOString(),
    demo: true,
  };
}
