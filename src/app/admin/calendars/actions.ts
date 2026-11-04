"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { syncHousehold } from "@/server/calendar/sync";
import { getDb, schema } from "@/server/db";
import { requireParent } from "@/server/parent";

/** Starts showing one of the signed-in Parent's Google Calendars on the Dashboard. */
export async function connectCalendar(form: FormData) {
  const parent = await requireParent();
  const externalId = String(form.get("externalId") ?? "");
  const name = String(form.get("name") ?? "").trim() || externalId;
  if (!externalId) return;

  const db = getDb();
  const [account] = await db
    .select({ id: schema.account.id })
    .from(schema.account)
    .where(and(eq(schema.account.userId, parent.userId), eq(schema.account.providerId, "google")))
    .limit(1);
  if (!account) return;

  await db
    .insert(schema.calendar)
    .values({ householdId: parent.householdId, provider: "google", externalId, name, accountId: account.id, userId: parent.userId })
    .onConflictDoNothing();
  await syncHousehold(parent.householdId, { onlyStale: true });
  refresh();
}

export async function disconnectCalendar(form: FormData) {
  const parent = await requireParent();
  const id = String(form.get("id"));
  // Events are removed with the Calendar (ON DELETE CASCADE).
  await getDb()
    .delete(schema.calendar)
    .where(and(eq(schema.calendar.id, id), eq(schema.calendar.householdId, parent.householdId)));
  refresh();
}

export async function syncNow() {
  const parent = await requireParent();
  await syncHousehold(parent.householdId);
  refresh();
}
