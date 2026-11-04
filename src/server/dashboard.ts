import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { addDays, toDayKey } from "@/domain/time";
import type { DashboardSnapshot, MemberColor } from "@/domain/types";
import { getDeviceProvider } from "@/devices";
import { isDemoMode } from "./config";
import { getDb, schema } from "./db";
import { DEMO_HOUSEHOLD_ID, getDemoSnapshot } from "./demo/data";
import { getParent } from "./parent";
import { resolveScreen, SCREEN_COOKIE } from "./screens";

/** Who is looking at the Dashboard: a paired Screen, a signed-in Parent, or anyone in demo mode. */
export type Viewer =
  | { kind: "demo"; householdId: typeof DEMO_HOUSEHOLD_ID }
  | { kind: "screen"; householdId: string; screenId: string }
  | { kind: "parent"; householdId: string };

export async function resolveViewer(): Promise<Viewer | null> {
  if (isDemoMode()) return { kind: "demo", householdId: DEMO_HOUSEHOLD_ID };
  const token = (await cookies()).get(SCREEN_COOKIE)?.value;
  const screen = await resolveScreen(token);
  if (screen) return { kind: "screen", ...screen };
  // Parents can preview the Dashboard from their own browser without pairing it.
  const parent = await getParent(await headers());
  if (parent) return { kind: "parent", householdId: parent.householdId };
  return null;
}

export async function getSnapshot(viewer: Viewer): Promise<DashboardSnapshot> {
  const devices = await getDeviceProvider().listDevices(viewer.householdId);
  if (viewer.kind === "demo") return { ...getDemoSnapshot(), devices };

  const db = getDb();
  const householdId = viewer.householdId;
  const [household] = await db.select().from(schema.household).where(eq(schema.household.id, householdId));
  if (!household) throw new Error(`Household ${householdId} not found`);

  const yesterday = addDays(toDayKey(new Date(), household.timeZone), -1);
  const [members, events, tasks] = await Promise.all([
    db
      .select()
      .from(schema.familyMember)
      .where(eq(schema.familyMember.householdId, householdId))
      .orderBy(asc(schema.familyMember.position)),
    db.select().from(schema.calendarEvent).where(eq(schema.calendarEvent.householdId, householdId)),
    db
      .select()
      .from(schema.task)
      // Open Tasks matter however old (overdue); done ones are trimmed below.
      .where(eq(schema.task.householdId, householdId)),
  ]);

  return {
    household: { id: household.id, name: household.name, timeZone: household.timeZone },
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      tag: m.tag,
      color: m.color as MemberColor,
      position: m.position,
      isParent: m.isParent,
    })),
    events: events.map((e) => ({ id: e.id, title: e.title, allDay: e.allDay, start: e.start, end: e.end })),
    tasks: tasks
      .filter((t) => !t.doneAt || t.dueDate >= yesterday)
      .map((t) => ({
        id: t.id,
        memberId: t.memberId,
        title: t.title,
        dueDate: t.dueDate,
        doneAt: t.doneAt?.toISOString() ?? null,
      })),
    devices,
    generatedAt: new Date().toISOString(),
    demo: false,
  };
}

/** Toggles a Task's done state, scoped to the viewer's Household. Returns false if not found. */
export async function toggleTask(householdId: string, taskId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ doneAt: schema.task.doneAt })
    .from(schema.task)
    .where(and(eq(schema.task.id, taskId), eq(schema.task.householdId, householdId)));
  if (!row) return false;
  await db
    .update(schema.task)
    .set({ doneAt: row.doneAt ? null : new Date() })
    .where(and(eq(schema.task.id, taskId), eq(schema.task.householdId, householdId)));
  return true;
}
