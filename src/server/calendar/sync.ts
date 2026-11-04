import "server-only";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { getAuth } from "../auth";
import { CALENDAR_SYNC_INTERVAL_MS } from "../config";
import { getDb, schema } from "../db";
import { listGoogleEvents } from "./google";

/** Synced window: yesterday through two weeks ahead, enough for "today + 6" plus browsing a week forward. */
const WINDOW_BEFORE_MS = 24 * 60 * 60 * 1000;
const WINDOW_AFTER_MS = 15 * 24 * 60 * 60 * 1000;

type CalendarRow = typeof schema.calendar.$inferSelect;

/** A valid Google access token for the account that connected the Calendar (refreshed if needed). */
export async function getGoogleAccessToken(accountId: string, userId: string): Promise<string> {
  const { accessToken } = await getAuth().api.getAccessToken({ body: { accountId, userId } });
  if (!accessToken) throw new Error("No Google access token for this account");
  return accessToken;
}

async function syncCalendar(cal: CalendarRow, now: Date): Promise<void> {
  const db = getDb();
  try {
    const token = await getGoogleAccessToken(cal.accountId, cal.userId);
    const events = await listGoogleEvents(
      token,
      cal.externalId,
      new Date(now.getTime() - WINDOW_BEFORE_MS),
      new Date(now.getTime() + WINDOW_AFTER_MS),
    );
    // Replace this Calendar's Events in one transaction (neon-http batches run atomically).
    const remove = db.delete(schema.calendarEvent).where(eq(schema.calendarEvent.calendarId, cal.id));
    const mark = db
      .update(schema.calendar)
      .set({ lastSyncedAt: now, lastSyncError: null })
      .where(eq(schema.calendar.id, cal.id));
    if (events.length > 0) {
      const insert = db.insert(schema.calendarEvent).values(
        events.map((e) => ({
          householdId: cal.householdId,
          calendarId: cal.id,
          externalId: e.id,
          title: e.title,
          allDay: e.allDay,
          start: e.start,
          end: e.end,
        })),
      );
      await db.batch([remove, insert, mark]);
    } else {
      await db.batch([remove, mark]);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Calendar sync failed for ${cal.id}:`, message);
    // Keep the old Events on screen; record the error for the Admin.
    await db
      .update(schema.calendar)
      .set({ lastSyncedAt: now, lastSyncError: message.slice(0, 500) })
      .where(eq(schema.calendar.id, cal.id));
  }
}

/** Syncs one Household's Calendars; with `onlyStale`, skips those synced in the last interval. */
export async function syncHousehold(householdId: string, { onlyStale = false } = {}): Promise<number> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - CALENDAR_SYNC_INTERVAL_MS);
  const calendars = await getDb()
    .select()
    .from(schema.calendar)
    .where(
      onlyStale
        ? and(
            eq(schema.calendar.householdId, householdId),
            or(isNull(schema.calendar.lastSyncedAt), lt(schema.calendar.lastSyncedAt, staleBefore)),
          )
        : eq(schema.calendar.householdId, householdId),
    );
  await Promise.all(calendars.map((cal) => syncCalendar(cal, now)));
  return calendars.length;
}

/** Used by the scheduled job: every Household, stale Calendars only. */
export async function syncAllHouseholds(): Promise<number> {
  const households = await getDb().select({ id: schema.household.id }).from(schema.household);
  let total = 0;
  for (const h of households) total += await syncHousehold(h.id, { onlyStale: true });
  return total;
}
